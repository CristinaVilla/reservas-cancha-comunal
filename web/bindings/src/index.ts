import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";


if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Slot {
  enabled: boolean;
  owner: Option<string>;
}

export const Errors = {
  1: {message:"InvalidStart"},
  2: {message:"SlotTaken"},
  3: {message:"ReservationNotFound"},
  4: {message:"NotOwner"},
  5: {message:"SlotAlreadyStarted"},
  6: {message:"SlotNotOpen"}
}




export interface Client {
  /**
   * Construct and simulate a cancel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel: ({user, start}: {user: string, start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_open transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_open: ({start}: {start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  reserve: ({user, start}: {user: string, start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_slot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_slot: ({start}: {start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Slot>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a open_slot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  open_slot: ({start}: {start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_reservation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_reservation: ({start}: {start: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin}: {admin: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAGY2FuY2VsAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFc3RhcnQAAAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAHaXNfb3BlbgAAAAABAAAAAAAAAAVzdGFydAAAAAAAAAYAAAABAAAAAQ==",
        "AAAAAAAAAAAAAAAHcmVzZXJ2ZQAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAFc3RhcnQAAAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAIZ2V0X3Nsb3QAAAABAAAAAAAAAAVzdGFydAAAAAAAAAYAAAABAAAH0AAAAARTbG90",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJb3Blbl9zbG90AAAAAAAAAQAAAAAAAAAFc3RhcnQAAAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAPZ2V0X3Jlc2VydmF0aW9uAAAAAAEAAAAAAAAABXN0YXJ0AAAAAAAABgAAAAEAAAPoAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAABFNsb3QAAAACAAAAAAAAAAdlbmFibGVkAAAAAAEAAAAAAAAABW93bmVyAAAAAAAD6AAAABM=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABgAAAAAAAAAMSW52YWxpZFN0YXJ0AAAAAQAAAAAAAAAJU2xvdFRha2VuAAAAAAAAAgAAAAAAAAATUmVzZXJ2YXRpb25Ob3RGb3VuZAAAAAADAAAAAAAAAAhOb3RPd25lcgAAAAQAAAAAAAAAElNsb3RBbHJlYWR5U3RhcnRlZAAAAAAABQAAAAAAAAALU2xvdE5vdE9wZW4AAAAABg==",
        "AAAABQAAAAAAAAAAAAAAClNsb3RPcGVuZWQAAAAAAAEAAAALc2xvdF9vcGVuZWQAAAAAAgAAAAAAAAAFc3RhcnQAAAAAAAAGAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADFNsb3RSZXNlcnZlZAAAAAEAAAANc2xvdF9yZXNlcnZlZAAAAAAAAAIAAAAAAAAABXN0YXJ0AAAAAAAABgAAAAEAAAAAAAAABHVzZXIAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVNsb3RDYW5jZWxsZWQAAAAAAAABAAAADnNsb3RfY2FuY2VsbGVkAAAAAAACAAAAAAAAAAVzdGFydAAAAAAAAAYAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAC" ]),
      options
    )
  }
  public readonly fromJSON = {
    cancel: this.txFromJSON<Result<void>>,
        is_open: this.txFromJSON<boolean>,
        reserve: this.txFromJSON<Result<void>>,
        get_slot: this.txFromJSON<Slot>,
        get_admin: this.txFromJSON<string>,
        open_slot: this.txFromJSON<Result<void>>,
        get_reservation: this.txFromJSON<Option<string>>
  }
}