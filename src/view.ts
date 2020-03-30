import { ArangoResponseMetadata } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";

export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch"
}

export function isArangoView(view: any): view is View {
  return Boolean(view && view.isArangoView);
}

export interface ViewDescription {
  globallyUniqueId: string;
  id: string;
  name: string;
  type: ViewType;
}

export interface ViewResponse {
  name: string;
  id: string;
  globallyUniqueId: string;
  type: ViewType;
}

export interface ArangoSearchViewCollectionLink {
  analyzers?: string[];
  fields?: { [key: string]: ArangoSearchViewCollectionLink | undefined };
  includeAllFields?: boolean;
  trackListPositions?: boolean;
  storeValues?: "none" | "id";
}

export interface ArangoSearchViewProperties {
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
}

export interface ArangoSearchViewPropertiesResponse
  extends ViewResponse,
    ArangoSearchViewProperties {
  type: ViewType.ARANGOSEARCH_VIEW;
}

export interface ArangoSearchViewPropertiesOptions {
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
      }
  )[];
  links?: {
    [key: string]: ArangoSearchViewCollectionLink | undefined;
  };
}

const VIEW_NOT_FOUND = 1203;
export class View<
  PropertiesOptions extends object = any,
  PropertiesResponse extends object = any
> {
  protected _name: string;
  protected _db: Database;

  /** @hidden */
  constructor(db: Database, name: string) {
    this._db = db;
    this._name = name;
  }

  get isArangoView(): true {
    return true;
  }

  get name() {
    return this._name;
  }

  get(): Promise<ViewResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}` },
      res => res.body
    );
  }

  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(options?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          type: ViewType.ARANGOSEARCH_VIEW,
          ...(options || {}),
          name: this.name
        }
      },
      res => res.body
    );
  }

  async rename(name: string): Promise<ViewResponse & ArangoResponseMetadata> {
    const result = await this._db.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/rename`,
        body: { name }
      },
      res => res.body
    );
    this._name = name;
    return result;
  }

  properties(): Promise<PropertiesResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}/properties` },
      res => res.body
    );
  }

  setProperties(properties?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {}
      },
      res => res.body
    );
  }

  replaceProperties(
    properties?: PropertiesOptions
  ): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {}
      },
      res => res.body
    );
  }

  drop(): Promise<boolean> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/view/${this.name}`
      },
      res => res.body.result
    );
  }
}

export type ArangoSearchView = View<
  ArangoSearchViewPropertiesOptions,
  ArangoSearchViewPropertiesResponse
>;
