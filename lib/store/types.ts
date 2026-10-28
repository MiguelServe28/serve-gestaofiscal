import type { Cliente, ContaEmail, Documento, EmailLog, Envio, LogAntigo, Modelo } from "../types";
import type { TipoEnvio } from "../leitura";

export interface Store {
  listClientes(): Promise<Cliente[]>;
  /** NIFs que devem ter guias no mês: clientes com processamento salarial ativo. */
  esperadosGuias(): Promise<Set<string>>;

  listEnvios(): Promise<Envio[]>;
  getEnvio(id: string): Promise<Envio | null>;
  obterOuCriarEnvio(tipo: TipoEnvio, periodo: string, titulo: string, por: string | null): Promise<Envio>;
  criarAvulso(titulo: string, mensagem: string, por: string | null): Promise<Envio>;
  guardarMensagem(id: string, titulo: string, mensagem: string): Promise<void>;
  apagarEnvio(id: string): Promise<void>;

  listDocumentos(envioId: string): Promise<Documento[]>;
  adicionarDocumento(d: Omit<Documento, "id" | "criado_em" | "caminho">, bytes: Uint8Array): Promise<Documento>;
  apagarDocumento(id: string): Promise<void>;
  lerDocumento(id: string): Promise<{ doc: Documento; bytes: Uint8Array } | null>;

  listEmails(envioId?: string): Promise<EmailLog[]>;
  registarEmail(e: Omit<EmailLog, "id" | "enviado_em"> & { enviado_por: string | null }): Promise<void>;
  logAntigo(): Promise<LogAntigo[]>;

  listModelos(): Promise<Modelo[]>;
  guardarModelo(m: Modelo): Promise<void>;

  /** Conta de envio do utilizador (desencriptada; só no servidor). */
  contaEmail(userId: string | null): Promise<ContaEmail | null>;
  /** Marca na Gestão Laboral o passo "guias enviadas" do mês. */
  marcarGuiasLaboral(nif: string, mes: string, dia: string): Promise<void>;
}
