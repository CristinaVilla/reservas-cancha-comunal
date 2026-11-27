import { Networks, StrKey } from '@stellar/stellar-sdk';
import varial from '@stellar/varial-sdk';
import { Client } from '../bindings/src/index.ts';

const messages = {
  InvalidStart: 'Elegí una hora futura que empiece en punto.',
  SlotTaken: 'El turno ya está reservado.',
  ReservationNotFound: 'No existe una reserva para ese turno.',
  NotOwner: 'Solo quien reservó puede cancelar.',
  SlotAlreadyStarted: 'El turno ya empezó.',
  SlotNotOpen: 'La asociación todavía no habilitó este turno.',
};

export async function connectWallet() {
  const result = await varial.requestAccess();
  if (result.error || !result.address) {
    throw new Error(result.error?.message || 'Abrí Varial y autorizá la conexión.');
  }
  return result.address;
}

export function connectContract(contractId) {
  if (!StrKey.isValidContract(contractId)) throw new Error('Ingresá el ID del contrato desplegado.');
  const options = {
    contractId,
    networkPassphrase: Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
  };
  const reader = new Client(options);

  return {
    async getAdmin() {
      return (await reader.get_admin()).result;
    },
    async getSlot(start) {
      const { result: slot } = await reader.get_slot({ start: BigInt(start) });
      return { enabled: slot.enabled, owner: slot.owner ?? null };
    },
    async act(action, actor, start) {
      const writer = new Client({ ...options, publicKey: actor, signTransaction: varial.signTransaction });
      const args = { start: BigInt(start) };
      const tx = await (action === 'open_slot'
        ? writer.open_slot(args)
        : writer[action]({ ...args, user: actor }));
      if (tx.result.isErr()) {
        const { message } = tx.result.unwrapErr();
        throw new Error(messages[message] ?? message);
      }

      const sent = await tx.signAndSend();
      if (sent.result.isErr()) {
        const { message } = sent.result.unwrapErr();
        throw new Error(messages[message] ?? message);
      }
      return sent.sendTransactionResponse?.hash;
    },
  };
}
