import { buildStacksDevnetOrchestrator } from '../../helper';
import { StacksBlockMetadata, StacksChainUpdate } from '@hirosystems/stacks-devnet-js';
import { assert } from 'console';
import { Constants, Accounts, Contracts } from '../../constants';
import {
    AnchorMode,
    broadcastTransaction,
    bufferCV,
    bufferCVFromString,
    getNonce,
    makeContractCall,
    PostConditionMode,
    tupleCV,
    uintCV,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import { principalCV } from '@stacks/transactions/dist/clarity/types/principalCV';
import { decodeBtcAddress } from '@stacks/stacking';
import { toBytes } from '@stacks/common';


const orchestrator = buildStacksDevnetOrchestrator();

beforeAll(() => orchestrator.start());
afterAll(() => orchestrator.stop());

test('submitting stacks-stx through pox-2 contract after epoch 2.1 transition should suceed', async () => {
    // Wait for Stacks genesis block to be mined
    let chainEvent: StacksChainUpdate = orchestrator.waitForStacksBlock();
    let blockHeight = chainEvent.new_blocks[0].block.block_identifier.index;
    assert(blockHeight == 1);

    // // Wait for 2.1 epoch transition
    // do {
    //     chainEvent = orchestrator.waitForStacksBlock();
    //     let metadata = chainEvent.new_blocks[0].block.metadata! as StacksBlockMetadata;
    //     blockHeight = metadata.bitcoin_anchor_block_identifier.index;
    // } while (blockHeight < Constants.DEVNET_DEFAULT_EPOCH_2_1);

    // Broadcast some STX stacking orders

    // Build a `stack-stx` transaction
    const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });
    const nonce = await getNonce(Accounts.DEPLOYER.stxAddress, network);
    let wallet1 = principalCV(Accounts.WALLET_1.stxAddress);

    const { hashMode, data } = decodeBtcAddress(Accounts.WALLET_1.btcAddress);
    const version = bufferCV(toBytes(new Uint8Array([hashMode.valueOf()])));
    const hashbytes = bufferCV(data);

    const txOptions = {
      contractAddress: Contracts.POX_1.address,
      contractName: Contracts.POX_1.name,
      functionName: "stack-stx",
      functionArgs: [
        uintCV(50_000_000_000_000),
        tupleCV({
            version,
            hashbytes,
        }),
        uintCV(blockHeight),
        uintCV(12),
      ],
      fee: 1000,
      nonce,
      network,
      anchorMode: AnchorMode.OnChainOnly,
      postConditionMode: PostConditionMode.Allow,
      senderKey: Accounts.WALLET_1.secretKey,
    };
    const tx = await makeContractCall(txOptions);
  
    // Broadcast transaction to our Devnet stacks node
    const result = await broadcastTransaction(tx, network);

    console.log(result);

    chainEvent = orchestrator.waitForStacksBlock();
    console.log(chainEvent.new_blocks[0].block.transactions);

    chainEvent = orchestrator.waitForStacksBlock();
    console.log(chainEvent.new_blocks[0].block.transactions);
})
