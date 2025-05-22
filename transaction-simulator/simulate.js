// transaction-simulator/simulate.js
const ethers = require("ethers");
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- EIP-7702 Constants ---
const SET_CODE_TX_TYPE_INT = 4;
const MAGIC_AUTHORIZATION_PREFIX = "0x05";

// --- Simulation Configuration (from .env or defaults) ---
const NUM_AUTHORIZABLE_CONTRACTS_TO_DEPLOY = parseInt(process.env.ENV_NUM_AUTHORIZABLE_CONTRACTS) || 1;
const NUM_FACTORY_CONTRACTS_TO_DEPLOY = parseInt(process.env.ENV_NUM_FACTORY_CONTRACTS) || 0;

const RUN_STALE_AUTH_NONCE_TEST = process.env.ENV_RUN_STALE_AUTH_NONCE_TEST === 'true';
const RUN_STATE_BASED_INVALIDATION_TEST = process.env.ENV_RUN_STATE_BASED_INVALIDATION_TEST === 'true';
const RUN_DELEGATED_CODE_NONCE_TEST = process.env.ENV_RUN_DELEGATED_CODE_NONCE_TEST === 'true';

const RUN_MIXED_LOAD_SIMULATION = process.env.ENV_RUN_MIXED_LOAD_SIMULATION === 'true';
const MIXED_LOAD_SIMULATION_ROUNDS = parseInt(process.env.ENV_MIXED_LOAD_ROUNDS) || 5;
const MIXED_LOAD_PERCENT_EIP7702_TXS = parseFloat(process.env.ENV_MIXED_LOAD_PERCENT_EIP7702) || 0.5;
const MIXED_LOAD_MAX_DELEGATIONS_PER_TX = parseInt(process.env.ENV_MIXED_LOAD_MAX_DELEGATIONS) || 2;

// --- Config from .env ---
const RPC_URL = process.env.RPC_URL;
const MAIN_SENDER_PRIVATE_KEY = process.env.SIMULATOR_PRIVATE_KEY;

// --- Load Contract Artifacts ---
const AUTHORIZABLE_ABI_PATH = path.resolve(__dirname, './compiled/Authorizable.abi.json');
const AUTHORIZABLE_ABI = JSON.parse(fs.readFileSync(AUTHORIZABLE_ABI_PATH, 'utf-8'));
const AUTHORIZABLE_BYTECODE = "608060405234801561000f575f80fd5b506105318061001d5f395ff3fe608060405234801561000f575f80fd5b5060043610610086575f3560e01c8063552410771161005957806355241077146100fe5780635e01eb5a1461011a57806367e404ce14610138578063cdce61dd1461015657610086565b80631cfb98161461008a57806320965255146100a65780633852ff71146100c45780633fa4f245146100e0575b5f80fd5b6100a4600480360381019061009f9190610374565b610174565b005b6100ae6101cc565b6040516100bb91906103c1565b60405180910390f35b6100de60048036038101906100d991906103da565b6101d4565b005b6100e861022c565b6040516100f591906103c1565b60405180910390f35b610118600480360381019061011391906103da565b610231565b005b6101226102ea565b60405161012f9190610444565b60405180910390f35b610140610312565b60405161014d9190610444565b60405180910390f35b61015e610337565b60405161016b91906103c1565b60405180910390f35b81600254146101b8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101af906104dd565b60405180910390fd5b6101c181610231565b806002819055505050565b5f8054905090565b806002819055503373ffffffffffffffffffffffffffffffffffffffff167fb62513b19e4fd357afbf52a5e33885fe23b746f8d3e95411be876711642131b88260405161022191906103c1565b60405180910390a250565b5f5481565b805f819055503360015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff167ff3f57717dff9f5f10af315efdbfadc60c42152c11fc0c3c413bbfbdc661f143c5f546040516102df91906103c1565b60405180910390a250565b5f60015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b60015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60025481565b5f80fd5b5f819050919050565b61035381610341565b811461035d575f80fd5b50565b5f8135905061036e8161034a565b92915050565b5f806040838503121561038a5761038961033d565b5b5f61039785828601610360565b92505060206103a885828601610360565b9150509250929050565b6103bb81610341565b82525050565b5f6020820190506103d45f8301846103b2565b92915050565b5f602082840312156103ef576103ee61033d565b5b5f6103fc84828501610360565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61042e82610405565b9050919050565b61043e81610424565b82525050565b5f6020820190506104575f830184610435565b92915050565b5f82825260208201905092915050565b7f437269746963616c2076616c7565206d69736d617463682c20616374696f6e205f8201527f61626f7274656421000000000000000000000000000000000000000000000000602082015250565b5f6104c760288361045d565b91506104d28261046d565b604082019050919050565b5f6020820190508181035f8301526104f4816104bb565b905091905056fea2646970667358221220ace04f3bbf07c61795b2dc7710e87153678fb0b37a8d144b18ff9dd3a88fa93864736f6c63430008140033";

const FACTORY_AUTHORIZABLE_ABI_PATH = path.resolve(__dirname, './compiled/FactoryAuthorizable.abi.json'); // <<< CREATE THIS ABI FILE
const FACTORY_AUTHORIZABLE_ABI = fs.existsSync(FACTORY_AUTHORIZABLE_ABI_PATH) ? JSON.parse(fs.readFileSync(FACTORY_AUTHORIZABLE_ABI_PATH, 'utf-8')) : [];
const FACTORY_AUTHORIZABLE_BYTECODE = "608060405234801561000f575f80fd5b506102ba8061001d5f395ff3fe608060405234801561000f575f80fd5b506004361061003f575f3560e01c80634c36f10d14610043578063b3eedf1214610061578063f4b25e051461007f575b5f80fd5b61004b610089565b6040516100589190610147565b60405180910390f35b61006961008e565b6040516100769190610147565b60405180910390f35b610087610096565b005b5f5481565b5f8054905090565b6040516100a290610123565b604051809103905ff0801580156100bb573d5f803e3d5ffd5b50505f808154809291906100ce9061018d565b91905055503373ffffffffffffffffffffffffffffffffffffffff167f33c981baba081f8fd2c52ac6ad1ea95b6814b4376640f55689051f6584729688306040516101199190610213565b60405180910390a2565b60588061022d83390190565b5f819050919050565b6101418161012f565b82525050565b5f60208201905061015a5f830184610138565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6101978261012f565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036101c9576101c8610160565b5b600182019050919050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6101fd826101d4565b9050919050565b61020d816101f3565b82525050565b5f6020820190506102265f830184610204565b9291505056fe6080604052348015600e575f80fd5b50603e80601a5f395ff3fe60806040525f80fdfea26469706673582212205ad678453b724bbf931958955d3cc85c9df03ab2d3a0ff625ce5ca9a3776d3db64736f6c63430008140033a26469706673582212201e1a506bb30ed18230ca24fe4529ac6813c9413bc415cc25e9d9337d3f1b74a764736f6c63430008140033"

// --- Validations ---
if (!RPC_URL) { console.error("❌ FATAL: RPC_URL missing in .env"); process.exit(1); }
if (!MAIN_SENDER_PRIVATE_KEY || MAIN_SENDER_PRIVATE_KEY.length < 60) { console.error("❌ FATAL: SIMULATOR_PRIVATE_KEY in .env missing or invalid."); process.exit(1); }
if (AUTHORIZABLE_BYTECODE.includes("YOUR_") || AUTHORIZABLE_BYTECODE.length < 50) { console.error("❌ FATAL: Update AUTHORIZABLE_BYTECODE in simulate.js."); process.exit(1); }
if (RUN_DELEGATED_CODE_NONCE_TEST && (FACTORY_AUTHORIZABLE_BYTECODE.includes("YOUR_") || FACTORY_AUTHORIZABLE_BYTECODE.length < 50 || FACTORY_AUTHORIZABLE_ABI.length === 0) ) {
    console.error("❌ FATAL: Update FACTORY_AUTHORIZABLE_BYTECODE and ensure FactoryAuthorizable.abi.json exists for its test scenario."); process.exit(1);
}

// --- Setup Ethers & Wallets ---
const provider = new ethers.JsonRpcProvider(RPC_URL);
const mainSenderWallet = new ethers.Wallet(MAIN_SENDER_PRIVATE_KEY, provider);

let delegatingAccountWallets = [];
const accountsConfigPath = path.resolve(__dirname, '../accounts.json');
if (fs.existsSync(accountsConfigPath)) {
    try {
        const accountsConfig = JSON.parse(fs.readFileSync(accountsConfigPath, 'utf-8'));
        if (Array.isArray(accountsConfig)) {
            delegatingAccountWallets = accountsConfig.map(acc => {
                if (!acc.privateKey || acc.privateKey.length < 60) {
                    console.warn(`⚠️ WARNING: Invalid private key for account '${acc.name || 'Unnamed'}' in accounts.json. Skipping.`);
                    return null;
                }
                return new ethers.Wallet(acc.privateKey, provider);
            }).filter(wallet => wallet !== null);
        } else { console.warn("⚠️ WARNING: accounts.json is not an array. Delegating accounts will be empty."); }
    } catch (e) { console.error("❌ FATAL: Could not parse accounts.json.", e); process.exit(1); }
}
console.log(`Loaded ${delegatingAccountWallets.length} delegating accounts from accounts.json.`);

// --- Statistics Object ---
const simConfigForStats = {
    numAuthorizableContracts: NUM_AUTHORIZABLE_CONTRACTS_TO_DEPLOY,
    numFactoryLikeContracts: NUM_FACTORY_CONTRACTS_TO_DEPLOY,
    numDelegatingAccountsLoaded: delegatingAccountWallets.length,
    rpcUrl: RPC_URL,
    testsRunFlags: { RUN_STALE_AUTH_NONCE_TEST, RUN_STATE_BASED_INVALIDATION_TEST, RUN_DELEGATED_CODE_NONCE_TEST, RUN_MIXED_LOAD_SIMULATION },
    mixedLoadRounds: RUN_MIXED_LOAD_SIMULATION ? MIXED_LOAD_SIMULATION_ROUNDS : 0,
    mixedLoadPercentEip7702: RUN_MIXED_LOAD_SIMULATION ? MIXED_LOAD_PERCENT_EIP7702_TXS * 100 : 0,
    mixedLoadMaxDelegations: RUN_MIXED_LOAD_SIMULATION ? MIXED_LOAD_MAX_DELEGATIONS_PER_TX : 0,
    testsExecuted: [] // Will be populated by test functions
};
const stats = {
    totalEip7702SetCodeTxAttempts: 0, totalEip7702SetCodeTxSucceeded: 0,
    totalIndividualAuthsAttempted: 0, totalIndividualAuthsSucceeded_CodeSet: 0,
    staleAuthNonceInvalidations_AuthFailedAsExpected: 0,
    staleAuthNonceInvalidations_OuterTxFailed: 0,
    stateBasedCallInvalidations_VictimTxRevertedAsExpected: 0,
    stateBasedCallInvalidations_AlteredOutcomeNoted: 0,
    delegatedCodeNonceInvalidations_StaleOutgoingTx: 0,
    totalNormalTxAttempts: 0, totalNormalTxSucceeded: 0,
    otherTxErrors: 0, setupErrors: 0
};

// --- Helper Functions ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomElement = (arr) => arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;

async function createAuthorizationTuple(delegatingAccountWallet, targetCodeAddress, authChainIdForSig) {
    const accountNonce = await provider.getTransactionCount(delegatingAccountWallet.address);

    const rlpChainIdForSigPayload = authChainIdForSig === 0 ? "0x" : ethers.toBeHex(authChainIdForSig);
    const rlpNonceForSigPayload = accountNonce === 0 ? "0x" : ethers.toBeHex(accountNonce);

    const rlpPayloadFields = [
        rlpChainIdForSigPayload,
        targetCodeAddress,
        rlpNonceForSigPayload
    ];
    const rlpPayload = ethers.encodeRlp(rlpPayloadFields);

    const messageToSignBytes = ethers.concat([
        ethers.getBytes(MAGIC_AUTHORIZATION_PREFIX),
        ethers.getBytes(rlpPayload)
    ]);
    const messageHash = ethers.keccak256(messageToSignBytes);
    const signature = delegatingAccountWallet.signingKey.sign(messageHash);

    const tupleChainId = authChainIdForSig === 0 ? "0x" : ethers.toBeHex(authChainIdForSig);
    const tupleNonce = accountNonce === 0 ? "0x" : ethers.toBeHex(accountNonce);
    const tupleYParity = signature.yParity === 0 ? "0x" : ethers.toBeHex(signature.yParity);

    // VVVVV CHANGE THESE TWO LINES VVVVV
    const tupleR = ethers.toBeHex(ethers.toBigInt(signature.r)); // Convert to BigInt then to minimal hex
    const tupleS = ethers.toBeHex(ethers.toBigInt(signature.s)); // Convert to BigInt then to minimal hex
    // ^^^^^ CHANGE THESE TWO LINES ^^^^^

    return [
        tupleChainId,
        targetCodeAddress,
        tupleNonce,
        tupleYParity,
        tupleR, // Use the new variables
        tupleS  // Use the new variables
    ];
}

async function sendEip7702SetCodeTransaction(sponsorWallet, targetEOAtoCallAfterAuth, callDataForOuterTx, authorizationListForTx, currentChainId) {
    const senderNonce = await sponsorWallet.getNonce();
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("1", "gwei");
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits("50", "gwei"); // Increased default maxFee
    const gasLimit = ethers.toBigInt(1000000 + (authorizationListForTx.length * 300000)); // Increased base and per-auth buffer

    const unsignedTxPayloadFields = [
        ethers.toBeHex(currentChainId), ethers.toBeHex(senderNonce),
        ethers.toBeHex(maxPriorityFeePerGas), ethers.toBeHex(maxFeePerGas),
        ethers.toBeHex(gasLimit),
        targetEOAtoCallAfterAuth, "0x", callDataForOuterTx, 
        [], authorizationListForTx
    ];
    const rlpUnsignedTxPayload = ethers.encodeRlp(unsignedTxPayloadFields);
    const digestToSign = ethers.keccak256(ethers.concat([ethers.getBytes(ethers.toBeHex(SET_CODE_TX_TYPE_INT, 1)), ethers.getBytes(rlpUnsignedTxPayload)]));
    const senderSignature = sponsorWallet.signingKey.sign(digestToSign);
    const signedTxRlpFields = [...unsignedTxPayloadFields, 
        senderSignature.yParity === 0 ? "0x" : ethers.toBeHex(senderSignature.yParity), 
        senderSignature.r, 
        senderSignature.s
    ];
    const rlpSignedTxPayload = ethers.encodeRlp(signedTxRlpFields);
    const rawEip7702Transaction = ethers.concat([ethers.getBytes(ethers.toBeHex(SET_CODE_TX_TYPE_INT, 1)), ethers.getBytes(rlpSignedTxPayload)]);
    
    console.log(`   Attempting to broadcast EIP-7702 raw transaction from ${sponsorWallet.address}`);
    const txResponse = await provider.broadcastTransaction(rawEip7702Transaction);
    // console.log(`   (Raw Tx: ${rawEip7702Transaction.substring(0,150)}...)`); // Optional: log start of raw tx
    console.log(`   ⏳ EIP-7702 Tx sent: ${txResponse.hash}`);
    const receipt = await txResponse.wait();
    console.log(`   ✅ EIP-7702 Tx confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);
    return { txResponse, receipt };
}

// --- Test Scenario Functions ---

async function testStaleAuthorizationNonceScenario(sponsorWallet, availableDelegatingWallets, authorizableContractInstances, currentChainId, authChainIdForSig) {
    console.log("\n--- SCENARIO: Testing Stale Authorization Nonce ---");
    simConfigForStats.testsExecuted.push("StaleAuthorizationNonce");
    if (availableDelegatingWallets.length < 1 || authorizableContractInstances.length < 1) {
        console.log("   Skipping: Needs at least 1 delegating account and 1 authorizable contract."); return;
    }
    
    // Prefer a fresh account if possible, or be aware of existing nonce
    const targetDelegatingWallet = getRandomElement(availableDelegatingWallets); 
    const targetCodeForStaleAuth = getRandomElement(authorizableContractInstances).target;
    const initialNonce = await provider.getTransactionCount(targetDelegatingWallet.address);
    console.log(`   Target Delegating Account: ${targetDelegatingWallet.address}, Initial Nonce: ${initialNonce}`);

    // Create the authorization tuple based on the initialNonce
    const staleAuthTuple = await createAuthorizationTuple(targetDelegatingWallet, targetCodeForStaleAuth, authChainIdForSig);
    
    console.log(`   Forcing nonce increment for ${targetDelegatingWallet.address} by sending a tx to ZeroAddress...`);
    stats.totalNormalTxAttempts++;
    try {
        // VVVVV MODIFIED NONCE BUMP TRANSACTION VVVVV
        const bumpNonceTx = await targetDelegatingWallet.sendTransaction({ 
            to: ethers.ZeroAddress, // Send to ZeroAddress or another clean EOA
            value: ethers.parseUnits("0.000000000000000001", "ether"), // 1 wei
            gasLimit: 30000, 
            maxFeePerGas: ethers.parseUnits("20", "gwei"), 
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei")
        });
        // ^^^^^ MODIFIED NONCE BUMP TRANSACTION ^^^^^
        await bumpNonceTx.wait(); 
        stats.totalNormalTxSucceeded++;
    } catch (e) {
        console.error(`   Error bumping nonce for ${targetDelegatingWallet.address}: ${e.message}`);
        stats.otherTxErrors++; return;
    }
    const nonceAfterBump = await provider.getTransactionCount(targetDelegatingWallet.address);
    console.log(`   Nonce for ${targetDelegatingWallet.address} after bump: ${nonceAfterBump}. Expected: ${Number(initialNonce) + 1}`);

    console.log("   Attempting to send EIP-7702 tx with the STALE authorization tuple...");
    stats.totalEip7702SetCodeTxAttempts++;
    stats.totalIndividualAuthsAttempted++; 
    let outerTxSucceededStaleTest = false;
    try {
        await sendEip7702SetCodeTransaction(sponsorWallet, ethers.ZeroAddress, "0x", [staleAuthTuple], currentChainId);
        stats.totalEip7702SetCodeTxSucceeded++; 
        outerTxSucceededStaleTest = true;
    } catch (e) {
        console.log(`   EIP-7702 tx (containing stale auth) itself failed to send/confirm: ${e.message.substring(0,150)}...`);
        stats.staleAuthNonceInvalidations_OuterTxFailed++; 
        stats.otherTxErrors++;
    }

    if (outerTxSucceededStaleTest) {
        const codeAfter = await provider.getCode(targetDelegatingWallet.address);
        const nonceAfterTx = await provider.getTransactionCount(targetDelegatingWallet.address);
        const expectedDelegationIndicator = `0xef0100${targetCodeForStaleAuth.slice(2).toLowerCase()}`;

        if (codeAfter.toLowerCase() !== expectedDelegationIndicator) {
            console.log(`   👍 Stale authorization for ${targetDelegatingWallet.address} correctly resulted in code NOT being set to ${targetCodeForStaleAuth}.`);
            stats.staleAuthNonceInvalidations_AuthFailedAsExpected++;
        } else {
            console.warn(`   ⚠️ Stale authorization for ${targetDelegatingWallet.address} unexpectedly SET the code!`);
        }
         if (BigInt(nonceAfterTx) === BigInt(nonceAfterBump)) {
             console.log(`   👍 Nonce for ${targetDelegatingWallet.address} (${nonceAfterTx}) correctly not incremented by the stale auth part of the EIP-7702 tx.`);
        } else {
             console.warn(`   ⚠️ Nonce for ${targetDelegatingWallet.address} (${nonceAfterTx}) changed from ${nonceAfterBump}. Auth might have been processed or another tx interfered.`);
        }
    }
    console.log("--- End Stale Authorization Nonce Test ---");
}


async function testStateBasedCallInvalidationScenario(sponsorWallet, availableDelegatingWallets, authorizableContractInstances, currentChainId, authChainIdForSig) {
    console.log("\n--- SCENARIO: Testing State-Based Call Invalidation ---");
    simConfigForStats.testsExecuted.push("StateBasedCallInvalidation");
    if (availableDelegatingWallets.length < 2 || authorizableContractInstances.length < 1) {
        console.log("   Skipping: Needs >=1 delegating account for EIP-7702 setup, and >=2 distinct wallets for actor roles (can include sponsor)."); return;
    }
    
    const delegatedEoaWallet = availableDelegatingWallets[0]; 
    const interfererWallet = availableDelegatingWallets[1]; 
    const actorWalletForVictimTx = sponsorWallet; 
    const targetAuthorizableContractObject = authorizableContractInstances[0]; 
    const targetCodeAddress = targetAuthorizableContractObject.target;

    if (interfererWallet.address === actorWalletForVictimTx.address) {
        console.log("   Skipping: State-based test needs distinct interferer and victim actors. Re-run with more accounts in accounts.json or adjust logic."); return;
    }

    console.log(`   Setting up: ${delegatedEoaWallet.address} will delegate to ${targetCodeAddress}`);
    const authTupleForSetup = await createAuthorizationTuple(delegatedEoaWallet, targetCodeAddress, authChainIdForSig);
    const initialCriticalValue = 100;
    const victimExpectedValueForConditionalAction = initialCriticalValue; // Actor A expects this
    const victimNewValueToSet = 200;
    const interfererSetValue = 999;
    const authorizableInterface = new ethers.Interface(AUTHORIZABLE_ABI);
    
    const setInitialStateCallData = authorizableInterface.encodeFunctionData("setCriticalValueForTest", [initialCriticalValue]);
    stats.totalEip7702SetCodeTxAttempts++;
    stats.totalIndividualAuthsAttempted++;
    try {
        await sendEip7702SetCodeTransaction(sponsorWallet, delegatedEoaWallet.address, setInitialStateCallData, [authTupleForSetup], currentChainId);
        stats.totalEip7702SetCodeTxSucceeded++;
        stats.totalIndividualAuthsSucceeded_CodeSet++;
        console.log(`   Code set for ${delegatedEoaWallet.address}; criticalValueForTest set to ${initialCriticalValue} via EIP-7702 outer call.`);
    } catch (e) {
        console.error(`   Failed to set up initial state for ${delegatedEoaWallet.address}: ${e.message}`);
        stats.otherTxErrors++; stats.setupErrors++; return;
    }
    
    const contractAtDelegatedEoa = targetAuthorizableContractObject.attach(delegatedEoaWallet.address);
    let currentCriticalVal = (await contractAtDelegatedEoa.criticalValueForTest()).toString();
    console.log(`   Initial criticalValue in ${delegatedEoaWallet.address} (on-chain): ${currentCriticalVal}`);
    if (currentCriticalVal !== initialCriticalValue.toString()) {
        console.warn(`   ⚠️ Initial critical value mismatch. Expected ${initialCriticalValue}, got ${currentCriticalVal}. Test may be skewed.`);
    }
    
    const callDataForVictimTx = authorizableInterface.encodeFunctionData("conditionalAction", [victimExpectedValueForConditionalAction, victimNewValueToSet]);
    console.log(`   Actor A (${actorWalletForVictimTx.address}) prepares TxVictim to call conditionalAction(${victimExpectedValueForConditionalAction}, ${victimNewValueToSet}) on ${delegatedEoaWallet.address}`);
    
    console.log(`   Actor B (${interfererWallet.address}) sends TxInterfering: setCriticalValueForTest(${interfererSetValue}) on ${delegatedEoaWallet.address}`);
    stats.totalNormalTxAttempts++;
    try {
        const interferingTx = await contractAtDelegatedEoa.connect(interfererWallet).setCriticalValueForTest(interfererSetValue);
        await interferingTx.wait();
        stats.totalNormalTxSucceeded++;
        currentCriticalVal = (await contractAtDelegatedEoa.criticalValueForTest()).toString();
        console.log(`   TxInterfering confirmed. criticalValue in ${delegatedEoaWallet.address} is now: ${currentCriticalVal}`);
    } catch (e) {
        console.error(`   TxInterfering from ${interfererWallet.address} failed: ${e.message}`);
        stats.otherTxErrors++; return; 
    }
        
    console.log(`   Now Actor A (${actorWalletForVictimTx.address}) sends its TxVictim (which expected criticalValue ${victimExpectedValueForConditionalAction})...`);
    stats.totalNormalTxAttempts++;
    try {
        const txVictim = await actorWalletForVictimTx.sendTransaction({
            to: delegatedEoaWallet.address, data: callDataForVictimTx, gasLimit: 300000,
            maxFeePerGas: ethers.parseUnits("30", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        });
        const receiptVictim = await txVictim.wait();
        stats.totalNormalTxSucceeded++; // Transaction was mined
        console.log(`   TxVictim from Actor A confirmed. Status: ${receiptVictim.status === 1n ? 'Success' : 'Failed/Reverted'}.`);
        
        if (receiptVictim.status !== 1n) { // It reverted
            // This is the expected path if the conditionalAction's require failed
            console.log(`   👍 TxVictim from Actor A correctly reverted (status 0). This is an expected invalidation due to state change!`);
            stats.stateBasedCallInvalidations_VictimTxRevertedAsExpected++;
        } else {
            // If it succeeded, it means the conditionalAction's require didn't trigger, or it passed.
            // This would be an "altered outcome" if the values set are not what would have happened without interference.
            const finalValue = (await contractAtDelegatedEoa.getValue()).toString();
            const finalCriticalValue = (await contractAtDelegatedEoa.criticalValueForTest()).toString();
            console.log(`   TxVictim succeeded. Final main value: ${finalValue}, Final criticalValue: ${finalCriticalValue}`);
            if (finalCriticalValue !== victimExpectedValueForConditionalAction.toString() && finalValue === victimNewValueToSet.toString()) {
                 console.log("   ⚠️ TxVictim succeeded but operated on an altered state (criticalValue was changed by interferer, but conditionalAction still passed or setValue was unconditional).");
                 stats.stateBasedCallInvalidations_AlteredOutcomeNoted++;
            } else {
                 console.log("   TxVictim succeeded, and state seems consistent with its action (or conditionalAction passed).");
            }
        }
    } catch (e) {
        // This catch block is for if sendTransaction itself throws (e.g., before mining, or if wait() throws for non-revert reasons)
        // Reverts are typically handled by checking receipt.status above.
        // However, ethers.js can sometimes throw for reverts if the node returns error data.
        let wasExpectedRevert = false;
        if (e.code === 'CALL_EXCEPTION' || (e.info && typeof e.info === 'object' && e.info.error && e.info.error.message)) {
            const errorMessage = ((e.info && e.info.error && e.info.error.message) ? e.info.error.message : e.message).toLowerCase();
            if (errorMessage.includes("critical value mismatch") || errorMessage.includes("revert")) {
                 console.log(`   👍 TxVictim from Actor A correctly failed with exception (likely revert due to "Critical value mismatch"). Expected invalidation!`);
                 stats.stateBasedCallInvalidations_VictimTxRevertedAsExpected++;
                 wasExpectedRevert = true;
            }
        }
        if (!wasExpectedRevert) {
            console.error(`   TxVictim from Actor A failed for an unexpected reason: ${e.message}`);
            stats.otherTxErrors++;
        }
    } 
    console.log("--- End State-Based Call Invalidation Test ---");
}


async function testDelegatedCodeNonceConsumptionScenario(sponsorWallet, availableDelegatingWallets, factoryContractInstance, currentChainId, authChainIdForSig) {
    console.log("\n--- SCENARIO: Testing Delegated Code Nonce Consumption ---");
    simConfigForStats.testsExecuted.push("DelegatedCodeNonceConsumption");
    if (!factoryContractInstance || FACTORY_AUTHORIZABLE_BYTECODE === "YOUR_FACTORY_AUTHORIZABLE_BYTECODE_HERE") { 
        console.log("   Skipping: FactoryAuthorizable contract not deployed or bytecode missing."); return; 
    }
    if (availableDelegatingWallets.length < 1) { console.log("   Skipping: Need at least 1 delegating EOA."); return; }

    const factoryEOAwallet = availableDelegatingWallets[0];
    console.log(`   Setting code for FactoryEOA ${factoryEOAwallet.address} to ${factoryContractInstance.target}...`);
    const authTuple = await createAuthorizationTuple(factoryEOAwallet, factoryContractInstance.target, authChainIdForSig);
    stats.totalEip7702SetCodeTxAttempts++;
    stats.totalIndividualAuthsAttempted++;
    try {
        await sendEip7702SetCodeTransaction(sponsorWallet, ethers.ZeroAddress, "0x", [authTuple], currentChainId);
        stats.totalEip7702SetCodeTxSucceeded++;
        stats.totalIndividualAuthsSucceeded_CodeSet++;
    } catch (e) {
        console.error(`   Failed to set code for FactoryEOA ${factoryEOAwallet.address}: ${e.message}`);
        stats.otherTxErrors++; stats.setupErrors++; return;
    }
    
    const initialNonceFactoryEOA = await provider.getTransactionCount(factoryEOAwallet.address);
    console.log(`   Initial Nonce of FactoryEOA ${factoryEOAwallet.address}: ${initialNonceFactoryEOA}`);

    console.log(`   Preparing TxStale (ETH transfer) FROM FactoryEOA with nonce ${initialNonceFactoryEOA}...`);
    const txStaleFields = {
        to: sponsorWallet.address, value: ethers.parseUnits("0.00001", "ether"), nonce: initialNonceFactoryEOA,
        gasLimit: 21000, maxFeePerGas: ethers.parseUnits("20", "gwei"), maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        chainId: currentChainId
    };
    const signedTxStale = await factoryEOAwallet.signTransaction(txStaleFields);

    console.log(`   Having sponsor call deploySimpleDummy() on FactoryEOA ${factoryEOAwallet.address}...`);
    const contractAtFactoryEOA = factoryContractInstance.connect(sponsorWallet).attach(factoryEOAwallet.address); // connect sponsor to interact
    stats.totalNormalTxAttempts++;
    try {
        const triggerTx = await contractAtFactoryEOA.deploySimpleDummy();
        await triggerTx.wait();
        stats.totalNormalTxSucceeded++;
        const nonceAfterDeploy = await provider.getTransactionCount(factoryEOAwallet.address);
        console.log(`   Nonce of FactoryEOA after deploySimpleDummy call: ${nonceAfterDeploy}. Expected: ${Number(initialNonceFactoryEOA) + 1}`);
        if (BigInt(nonceAfterDeploy) !== BigInt(initialNonceFactoryEOA) + 1n) {
            console.warn("   ⚠️ FactoryEOA nonce did not increment as expected by deploySimpleDummy!");
        }
    } catch (e) {
        console.error(`   Error calling deploySimpleDummy on FactoryEOA: ${e.message}`);
        stats.otherTxErrors++; return;
    }

    console.log("   Attempting to broadcast TxStale (with now outdated nonce)...");
    stats.totalNormalTxAttempts++;
    try {
        const staleTxResponse = await provider.broadcastTransaction(signedTxStale);
        await staleTxResponse.wait();
        stats.totalNormalTxSucceeded++; // Should not happen
        console.warn("   ⚠️ TxStale (from FactoryEOA) unexpectedly succeeded! Nonce issue not triggered as expected.");
    } catch (error) {
        // Check for specific nonce errors
        if (error.message.toLowerCase().includes("nonce too low") || 
            error.message.toLowerCase().includes("invalid nonce") ||
            error.message.toLowerCase().includes("known transaction") || // Geth might respond with this if a tx with same hash & nonce but different gas is already known
            (error.info && error.info.error && error.info.error.message && error.info.error.message.toLowerCase().includes("nonce too low")) // Ethers wraps some errors
            ) {
            console.log(`   👍 TxStale correctly failed due to nonce issue.`);
            stats.delegatedCodeNonceInvalidations_StaleOutgoingTx++;
        } else {
            console.error(`   TxStale failed for an unexpected reason: ${error.message}`);
            stats.otherTxErrors++;
        }
    }
    console.log("--- End Delegated Code Nonce Consumption Test ---");
}


// --- Main Execution Function ---
async function main() {
    console.log(`▶️ Main Transaction Sender: ${mainSenderWallet.address}`);
    delegatingAccountWallets.forEach((wallet, idx) => {
        console.log(`👤 Delegating Account for Code Setting ${idx + 1}: ${wallet.address.substring(0,10)}...`);
    });

    try {
        const mainBalance = await provider.getBalance(mainSenderWallet.address);
        console.log(`💰 Main Sender Balance: ${ethers.formatEther(mainBalance)} ETH`);
        for (const wallet of delegatingAccountWallets) {
            if(wallet && wallet.address) { // Check if wallet is valid
                const balance = await provider.getBalance(wallet.address);
                console.log(`💰 Delegating Account ${wallet.address.substring(0,10)}... Balance: ${ethers.formatEther(balance)} ETH`);
            }
        }
        console.log(`📡 Connected to RPC: ${RPC_URL}`);

        const network = await provider.getNetwork();
        const currentChainId = network.chainId;
        const authChainIdForSignature = 0; 

        // Deploy Authorizable Contracts
        const authorizableInstances = []; // Stores ethers.Contract objects
        const authorizableFactory = new ethers.ContractFactory(AUTHORIZABLE_ABI, AUTHORIZABLE_BYTECODE, mainSenderWallet);
        if (NUM_AUTHORIZABLE_CONTRACTS_TO_DEPLOY > 0) {
            console.log(`\n🚀 Deploying ${NUM_AUTHORIZABLE_CONTRACTS_TO_DEPLOY} 'Authorizable' contract(s)...`);
            for (let i = 0; i < NUM_AUTHORIZABLE_CONTRACTS_TO_DEPLOY; i++) {
                const contract = await authorizableFactory.deploy();
                await contract.waitForDeployment();
                const deployedContractAddress = await contract.getAddress();
                authorizableInstances.push(new ethers.Contract(deployedContractAddress, AUTHORIZABLE_ABI, provider)); // Use provider for reads by default
                console.log(`✅ Authorizable contract ${i + 1} deployed at: ${deployedContractAddress}`);
            }
        }
        
        let factoryContractInstance = null;
        if (NUM_FACTORY_CONTRACTS_TO_DEPLOY > 0 && FACTORY_AUTHORIZABLE_BYTECODE !== "YOUR_FACTORY_AUTHORIZABLE_BYTECODE_HERE" && FACTORY_AUTHORIZABLE_ABI.length > 0) {
            console.log(`\n🚀 Deploying ${NUM_FACTORY_CONTRACTS_TO_DEPLOY} 'FactoryAuthorizable' contract(s)...`);
            const factoryFactory = new ethers.ContractFactory(FACTORY_AUTHORIZABLE_ABI, FACTORY_AUTHORIZABLE_BYTECODE, mainSenderWallet);
            const contract = await factoryFactory.deploy(); // Assuming we deploy just one for the test scenario
            await contract.waitForDeployment();
            const deployedFactoryAddress = await contract.getAddress();
            factoryContractInstance = new ethers.Contract(deployedFactoryAddress, FACTORY_AUTHORIZABLE_ABI, provider); // Use provider for reads
            console.log(`✅ FactoryAuthorizable contract 1 deployed at: ${deployedFactoryAddress}`);
        } else if (RUN_DELEGATED_CODE_NONCE_TEST && NUM_FACTORY_CONTRACTS_TO_DEPLOY > 0) {
            console.warn("⚠️ FactoryAuthorizable bytecode/ABI not properly set up, related test might be skipped or may fail if the instance is null.");
        }

        // --- Run Specific Test Scenarios ---
        if (RUN_STALE_AUTH_NONCE_TEST) {
            await testStaleAuthorizationNonceScenario(mainSenderWallet, delegatingAccountWallets, authorizableInstances, currentChainId, authChainIdForSignature);
            await delay(1000);
        }
        if (RUN_STATE_BASED_INVALIDATION_TEST) {
            await testStateBasedCallInvalidationScenario(mainSenderWallet, delegatingAccountWallets, authorizableInstances, currentChainId, authChainIdForSignature);
            await delay(1000);
        }
        if (RUN_DELEGATED_CODE_NONCE_TEST) {
            await testDelegatedCodeNonceConsumptionScenario(mainSenderWallet, delegatingAccountWallets, factoryContractInstance, currentChainId, authChainIdForSignature);
            await delay(1000);
        }

        // --- (Optional) Mixed Load Simulation Loop ---
        if (RUN_MIXED_LOAD_SIMULATION) {
            console.log("\n--- Running Mixed Load Simulation ---");
            for (let round = 0; round < MIXED_LOAD_SIMULATION_ROUNDS; round++) {
                console.log(`\n--- Mixed Load Round ${round + 1} / ${MIXED_LOAD_SIMULATION_ROUNDS} ---`);
                const isEip7702Round = Math.random() < MIXED_LOAD_PERCENT_EIP7702_TXS;
                
                if (isEip7702Round && delegatingAccountWallets.length > 0 && authorizableInstances.length > 0) {
                    stats.totalEip7702SetCodeTxAttempts++;
                    const numAuthsThisTx = Math.max(1, Math.floor(Math.random() * Math.min(MIXED_LOAD_MAX_DELEGATIONS_PER_TX, delegatingAccountWallets.length)) + 1);
                    const selectedDelegatingWallets = [...delegatingAccountWallets].sort(() => 0.5 - Math.random()).slice(0, numAuthsThisTx);
                    stats.totalIndividualAuthsAttempted += selectedDelegatingWallets.length;
                    
                    const authorizationList = [];
                    for (const delegatingWallet of selectedDelegatingWallets) {
                        const targetCodeAddrToDelegateTo = getRandomElement(authorizableInstances).target;
                        try {
                            authorizationList.push(await createAuthorizationTuple(delegatingWallet, targetCodeAddrToDelegateTo, authChainIdForSignature));
                        } catch (e) { console.error(` Error creating auth in mixed load for ${delegatingWallet.address}: ${e.message}`);}
                    }

                    if (authorizationList.length > 0) {
                        const firstDelegatedAddressInSelection = selectedDelegatingWallets[0].address; 
                        const callData = new ethers.Interface(AUTHORIZABLE_ABI).encodeFunctionData("setValue", [8000 + round]);
                        try {
                            const { receipt } = await sendEip7702SetCodeTransaction(mainSenderWallet, firstDelegatedAddressInSelection, callData, authorizationList, currentChainId);
                            if (receipt.status === 1) {
                                stats.totalEip7702SetCodeTxSucceeded++;
                                // Post-tx checks for successful auths
                                for(const delegatingWallet of selectedDelegatingWallets) {
                                    const code = await provider.getCode(delegatingWallet.address);
                                    // This check needs to be more precise, comparing against the targetCodeAddr it was *intended* for in this tx
                                    if (code.startsWith("0xef0100")) stats.totalIndividualAuthsSucceeded_CodeSet++;
                                }
                            } else {
                                stats.otherTxErrors++;
                                console.error(` Mixed load EIP-7702 tx reverted: ${receipt.transactionHash}`);
                            }
                        } catch (e) { stats.otherTxErrors++; console.error(` Mixed load EIP-7702 tx failed to send/confirm: ${e.message}`);}
                    }
                } else { // Normal Transaction
                    stats.totalNormalTxAttempts++;
                    const actorWallets = mainSenderWallet ? [mainSenderWallet, ...delegatingAccountWallets] : [...delegatingAccountWallets];
                    const actor = getRandomElement(actorWallets.filter(w=>w));
                    
                    if (actor) {
                        try {
                            if (Math.random() < 0.4 && actorWallets.length > 1 && authorizableInstances.length > 0) { // Call an authorizable contract
                                const targetContract = getRandomElement(authorizableInstances);
                                const tx = await targetContract.connect(actor).setValue(9000 + round);
                                await tx.wait();
                                stats.totalNormalTxSucceeded++;
                            } else if (actorWallets.length > 1) { // ETH Transfer
                                 let recipient = getRandomElement(actorWallets.filter(w => w && w.address !== actor.address));
                                 if (recipient) {
                                    const tx = await actor.sendTransaction({to: recipient.address, value: ethers.parseUnits("0.00001", "ether")});
                                    await tx.wait();
                                    stats.totalNormalTxSucceeded++;
                                 } else { console.log("   Skipping normal ETH transfer, no other recipient.");}
                            } else {
                                console.log("   Skipping normal transaction, not enough actors/contracts.");
                            }
                        } catch (e) { stats.otherTxErrors++; console.error(` Mixed load normal tx from ${actor.address} failed: ${e.message}`); }
                    }
                }
                await delay(Math.floor(Math.random() * 1000) + 200); 
            }
        }

        // --- Print Summary ---
        console.log("\n\n--- EXECUTION FINISHED ---");
        console.log("--- Simulation Summary ---");
        console.log("\nParameters Used for This Run:");
        console.log(`  - Target RPC URL: ${simConfigForStats.rpcUrl}`);
        console.log(`  - Main Transaction Sender: ${mainSenderWallet.address}`);
        console.log(`  - Number of Delegating Accounts Loaded: ${simConfigForStats.numDelegatingAccountsLoaded}`);
        console.log(`  - Deployed 'Authorizable' Contract Instances: ${simConfigForStats.numAuthorizableContracts}`);
        console.log(`  - Deployed 'FactoryAuthorizable' Contract Instances: ${simConfigForStats.numFactoryLikeContracts}`);

        console.log("\nTest Scenarios Executed:");
        simConfigForStats.testsExecuted.forEach(testName => console.log(`  - ${testName}`));
        
        if (RUN_MIXED_LOAD_SIMULATION) {
            console.log(`\nMixed Load Simulation Parameters:`);
            console.log(`  - Rounds: ${simConfigForStats.mixedLoadRounds}`);
            console.log(`  - Target % EIP-7702 Txs: ${simConfigForStats.mixedLoadPercentEip7702}%`);
            console.log(`  - Max Delegations per EIP-7702 Tx: ${simConfigForStats.mixedLoadMaxDelegations}`);
        }
        
        console.log("\nOverall Transaction & Event Statistics:");
        console.log(`  - EIP-7702 'Set Code' Transactions Attempted: ${stats.totalEip7702SetCodeTxAttempts}`);
        console.log(`  - EIP-7702 'Set Code' Transactions Succeeded (mined): ${stats.totalEip7702SetCodeTxSucceeded}`);
        console.log(`  - Individual Authorizations Attempted: ${stats.totalIndividualAuthsAttempted}`);
        console.log(`  - Individual Authorizations Succeeded (Verified Code Set): ${stats.totalIndividualAuthsSucceeded_CodeSet}`);
        console.log(`  - 'Normal' Transactions Attempted: ${stats.totalNormalTxAttempts}`);
        console.log(`  - 'Normal' Transactions Succeeded (mined): ${stats.totalNormalTxSucceeded}`);
        
        console.log("\nDetected Invalidations / Specific Test Outcomes:");
        console.log(`  - Stale Auth Nonce: Auths Failed As Expected (code not set): ${stats.staleAuthNonceInvalidations_AuthFailedAsExpected}`);
        console.log(`  - Stale Auth Nonce: Outer EIP-7702 Tx Failed During Test: ${stats.staleAuthNonceInvalidations_OuterTxFailed}`);
        console.log(`  - State-Based Call Invalidations (Victim Tx Reverted as Expected): ${stats.stateBasedCallInvalidations_VictimTxRevertedAsExpected}`);
        console.log(`  - State-Based Call Invalidations (Victim Tx Altered Outcome): ${stats.stateBasedCallInvalidations_AlteredOutcomeNoted}`);
        console.log(`  - Delegated Code Nonce Invalidations (Outgoing Tx Failed As Expected): ${stats.delegatedCodeNonceInvalidations_StaleOutgoingTx}`);
        console.log(`  - Other Transaction Sending/Confirmation Errors: ${stats.otherTxErrors}`);
        console.log(`  - Setup Errors (preventing test run): ${stats.setupErrors}`);
        
        const totalDefinedInvalidations = stats.staleAuthNonceInvalidations_AuthFailedAsExpected + 
                                      stats.staleAuthNonceInvalidations_OuterTxFailed + 
                                      stats.stateBasedCallInvalidations_VictimTxRevertedAsExpected +
                                      stats.delegatedCodeNonceInvalidations_StaleOutgoingTx;

        console.log(`\nTotal Defined 'Invalidation Events' Successfully Triggered & Detected: ${totalDefinedInvalidations}`);
        console.log("--- End of Summary ---");

    } catch (error) {
        console.error("\n❌ FATAL Error during simulation setup or main execution:", error.message);
        if (error.stack) console.error(error.stack);
        stats.otherTxErrors++; // Count this as a major error
        // Print summary even if there's a fatal error in main execution, if stats were initialized
        if (simConfigForStats && stats) { // Ensure they exist
            console.log("\n--- PARTIAL SUMMARY DUE TO ERROR ---");
             // ... (condensed version of stats printing)
            console.log(`  EIP-7702 Tx Attempts: ${stats.totalEip7702SetCodeTxAttempts}, Normal Tx Attempts: ${stats.totalNormalTxAttempts}, Other Errors: ${stats.otherTxErrors}`);
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error("\n❌ FATAL Unhandled error in main function:", error);
    process.exit(1);
});