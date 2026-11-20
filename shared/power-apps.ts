import { getClient, type DataClient, type IOperationOptions, type IOperationResult } from "@microsoft/power-apps/data";
import { bindQuery, bindRecord, canonicalRecord, edition, nativeName, type EditionProfile } from "./edition.ts";

type Sources = Parameters<typeof getClient>[0];

export interface TableService {
  getAll(options?: IOperationOptions): Promise<IOperationResult<unknown[]>>;
  get(id: string, options?: IOperationOptions): Promise<IOperationResult<unknown>>;
  create(record: Record<string, unknown>): Promise<IOperationResult<unknown>>;
  update(id: string, changedFields: Record<string, unknown>): Promise<IOperationResult<unknown>>;
  delete(id: string): Promise<IOperationResult<void>>;
  upload(id: string, columnName: string, file: File): Promise<IOperationResult<void>>;
  downloadImage(id: string, columnName: string, fullSize?: boolean): Promise<IOperationResult<Uint8Array>>;
  deleteFileOrImage(id: string, columnName: string): Promise<IOperationResult<void>>;
}

export interface FlowService {
  Run(input: Record<string, unknown>): Promise<IOperationResult<unknown>>;
}

export function bindSources(sources: Sources, profile: EditionProfile): Sources {
  return Object.fromEntries(Object.entries(sources).map(([name, source]) => [
    name.startsWith("adopta")
      ? name.replace(/^adopta/, profile.flowPrefix.toLowerCase())
      : nativeName(name, profile),
    { ...source, primaryKey: source.primaryKey ? nativeName(source.primaryKey, profile) : source.primaryKey },
  ]));
}

export function tableService(client: DataClient, name: string, profile: EditionProfile): TableService {
  const table = nativeName(name, profile);
  const options = (query?: IOperationOptions): IOperationOptions | undefined => query && ({
    ...query,
    select: query.select?.map((field) => nativeName(field, profile)),
    filter: query.filter && bindQuery(query.filter, profile),
    orderBy: query.orderBy?.map((order) => bindQuery(order, profile)),
  });
  const result = <T>(response: IOperationResult<T>): IOperationResult<unknown> => ({
    ...response, data: canonicalRecord(response.data, profile),
  });
  return {
    getAll: async (query) => {
      const response = await client.retrieveMultipleRecordsAsync<unknown>(table, options(query));
      if (!response.success) return response;
      if (!Array.isArray(response.data)) throw new Error(`Invalid Dataverse rows returned for ${table}.`);
      return { ...response, data: response.data.map((row) => canonicalRecord(row, profile)) };
    },
    get: async (id, query) => result(await client.retrieveRecordAsync<unknown>(table, id, options(query))),
    create: async (record) => result(await client.createRecordAsync<Record<string, unknown>, unknown>(table, bindRecord(record, profile))),
    update: async (id, record) => result(await client.updateRecordAsync<Record<string, unknown>, unknown>(table, id, bindRecord(record, profile))),
    delete: (id) => client.deleteRecordAsync(table, id),
    upload: async (id, column, file) => client.uploadFileToRecord(table, id, column, file.name, new Uint8Array(await file.arrayBuffer())),
    downloadImage: (id, column, fullSize) => client.downloadImageFromRecord(table, id, column, fullSize),
    deleteFileOrImage: (id, column) => client.deleteFileOrImageFromRecord(table, id, column),
  };
}

export function services(sources: Sources) {
  const profile = edition();
  const metadata = bindSources(sources, profile);
  let client: DataClient | undefined;
  const get = (name: string) => {
    if (!Object.hasOwn(metadata, name)) throw new Error(`Missing ${profile.label} data source: ${name}. Regenerate the edition's Power Apps bindings.`);
    return client ??= getClient(metadata);
  };
  return {
    table: (name: string) => () => tableService(get(nativeName(name, profile)), name, profile),
    flow: (name: "schedulecommunication" | "managecommunication"): (() => FlowService) => () => ({
      Run: (input) => get(profile.flowPrefix.toLowerCase() + name).executeAsync<{ input: Record<string, unknown>; "api-version": string }, unknown>({
        connectorOperation: {
          tableName: profile.flowPrefix.toLowerCase() + name,
          operationName: "Run",
          parameters: { input, "api-version": "2015-02-01-preview" },
        },
      }),
    }),
  };
}
