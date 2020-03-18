import { Connection } from "./connection";
import { isArangoError } from "./error";
import { ArangoResponseMetadata } from "./util/types";

export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch"
}

export interface ArangoView {
  isArangoView: true;
  name: string;
}

export type ViewDescription = {
  globallyUniqueId: string;
  id: string;
  name: string;
  type: ViewType;
};

export type ArangoViewResponse = {
  name: string;
  id: string;
  globallyUniqueId: string;
  type: ViewType;
};

export type ArangoSearchViewCollectionLink = {
  analyzers?: string[];
  fields?: { [key: string]: ArangoSearchViewCollectionLink | undefined };
  includeAllFields?: boolean;
  trackListPositions?: boolean;
  storeValues?: "none" | "id";
};

export type ArangoSearchViewProperties = {
  cleanupIntervalStep: number;
  consolidationIntervalMsec: number;
  writebufferIdle: number;
  writebufferActive: number;
  writebufferSizeMax: number;
  consolidationPolicy: {
    type: "bytes_accum" | "tier";
    threshold?: number;
    segments_min?: number;
    segments_max?: number;
    segments_bytes_max?: number;
    segments_bytes_floor?: number;
    lookahead?: number;
  };
  links: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
};

export type ArangoSearchViewPropertiesResponse = ArangoViewResponse &
  ArangoSearchViewProperties & {
    type: ViewType.ARANGOSEARCH_VIEW;
  };

export type ArangoSearchViewPropertiesOptions = {
  cleanupIntervalStep?: number;
  consolidationIntervalMsec?: number;
  commitIntervalMsec?: number;
  writebufferIdle?: number;
  writebufferActive?: number;
  writebufferSizeMax?: number;
  consolidationPolicy?:
    | {
        type: "bytes_accum";
        threshold?: number;
      }
    | {
        type: "tier";
        lookahead?: number;
        segments_min?: number;
        segments_max?: number;
        segments_bytes_max?: number;
        segments_bytes_floor?: number;
      };
  primarySort?: (
    | {
        field: string;
        direction: "desc" | "asc";
      }
    | {
        field: string;
        asc: boolean;
      })[];
  links?: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
};

const VIEW_NOT_FOUND = 1203;
export abstract class BaseView implements ArangoView {
  isArangoView: true = true;
  name: string;
  abstract type: ViewType;
  protected _connection: Connection;

  constructor(connection: Connection, name: string) {
    this.name = name;
    this._connection = connection;
  }

  get(): Promise<ArangoViewResponse & ArangoResponseMetadata> {
    return this._connection.request(
      { path: `/_api/view/${this.name}` },
      res => res.body
    );
  }

  exists(): Promise<boolean> {
    return this.get().then(
      () => true,
      err => {
        if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
          return false;
        }
        throw err;
      }
    );
  }

  async rename(
    name: string
  ): Promise<ArangoViewResponse & ArangoResponseMetadata> {
    const result = await this._connection.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/rename`,
        body: { name }
      },
      res => res.body
    );
    this.name = name;
    return result;
  }

  drop(): Promise<boolean> {
    return this._connection.request(
      {
        method: "DELETE",
        path: `/_api/view/${this.name}`
      },
      res => res.body.result
    );
  }
}

export class ArangoSearchView extends BaseView {
  type = ViewType.ARANGOSEARCH_VIEW;

  create(
    properties: ArangoSearchViewPropertiesOptions = {}
  ): Promise<ArangoSearchViewPropertiesResponse> {
    return this._connection.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          ...properties,
          name: this.name,
          type: this.type
        }
      },
      res => res.body
    );
  }

  properties(): Promise<
    ArangoSearchViewPropertiesResponse & ArangoResponseMetadata
  > {
    return this._connection.request(
      { path: `/_api/view/${this.name}/properties` },
      res => res.body
    );
  }

  setProperties(
    properties: ArangoSearchViewPropertiesOptions = {}
  ): Promise<ArangoSearchViewPropertiesResponse> {
    return this._connection.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties
      },
      res => res.body
    );
  }

  replaceProperties(
    properties: ArangoSearchViewPropertiesOptions = {}
  ): Promise<ArangoSearchViewPropertiesResponse> {
    return this._connection.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties
      },
      res => res.body
    );
  }
}

/**
 * @private
 */
export function _constructView(
  connection: Connection,
  data: ViewDescription
): ArangoView {
  if (data.type && data.type !== ViewType.ARANGOSEARCH_VIEW) {
    throw new Error(`Unknown view type "${data.type}"`);
  }
  return new ArangoSearchView(connection, data.name);
}
