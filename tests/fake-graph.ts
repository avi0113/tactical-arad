import type { GraphClient, GraphRequest } from "../src/lib/sharepoint/graph";

type Item = {
  id: string;
  fields: Record<string, string>;
  createdDateTime: string;
  lastModifiedDateTime: string;
};

type ListRecord = {
  id: string;
  displayName: string;
  columns: Array<{ name: string }>;
  items: Item[];
};

export class FakeGraph implements GraphClient {
  readonly lists: ListRecord[] = [];
  patchCount = 0;
  createCount = 0;
  deleteCount = 0;
  private sequence = 1;

  list(displayName: string): ListRecord | undefined {
    return this.lists.find((item) => item.displayName === displayName);
  }

  resetCounts() {
    this.patchCount = 0;
    this.createCount = 0;
    this.deleteCount = 0;
  }

  async request<T>(request: GraphRequest): Promise<T> {
    const url = new URL(request.path, "https://graph.local");
    const path = url.pathname;
    const listMatch = path.match(/^\/sites\/([^/]+)\/lists$/);
    if (listMatch && request.method === "GET") {
      return { value: this.lists.map((list) => ({ id: list.id, displayName: list.displayName })) } as T;
    }
    if (listMatch && request.method === "POST") {
      const body = request.body as { displayName: string };
      if (this.lists.some((list) => list.displayName === body.displayName)) {
        throw new Error(`duplicate list ${body.displayName}`);
      }
      const list: ListRecord = { id: `list-${this.sequence++}`, displayName: body.displayName, columns: [], items: [] };
      this.lists.push(list);
      return { id: list.id, displayName: list.displayName } as T;
    }

    const columnMatch = path.match(/^\/sites\/([^/]+)\/lists\/([^/]+)\/columns$/);
    if (columnMatch && request.method === "GET") {
      const list = this.requireList(columnMatch[2]);
      return { value: list.columns } as T;
    }
    if (columnMatch && request.method === "POST") {
      const list = this.requireList(columnMatch[2]);
      const body = request.body as { name: string };
      if (list.columns.some((column) => column.name === body.name)) throw new Error(`duplicate column ${body.name}`);
      list.columns.push({ name: body.name });
      return { name: body.name } as T;
    }

    const itemsMatch = path.match(/^\/sites\/([^/]+)\/lists\/([^/]+)\/items$/);
    if (itemsMatch && request.method === "GET") {
      const list = this.requireList(itemsMatch[2]);
      return {
        value: list.items.map((item) => ({
          id: item.id,
          createdDateTime: item.createdDateTime,
          lastModifiedDateTime: item.lastModifiedDateTime,
          fields: { ...item.fields },
        })),
      } as T;
    }
    if (itemsMatch && request.method === "POST") {
      const list = this.requireList(itemsMatch[2]);
      const body = request.body as { fields: Record<string, string> };
      const now = new Date().toISOString();
      const item: Item = {
        id: String(this.sequence++),
        fields: { ...body.fields },
        createdDateTime: now,
        lastModifiedDateTime: now,
      };
      list.items.push(item);
      this.createCount += 1;
      return { id: item.id } as T;
    }

    const fieldMatch = path.match(/^\/sites\/([^/]+)\/lists\/([^/]+)\/items\/([^/]+)\/fields$/);
    if (fieldMatch && request.method === "PATCH") {
      const list = this.requireList(fieldMatch[2]);
      const item = list.items.find((candidate) => candidate.id === fieldMatch[3]);
      if (!item) throw new Error(`missing item ${fieldMatch[3]}`);
      item.fields = { ...item.fields, ...(request.body as Record<string, string>) };
      item.lastModifiedDateTime = new Date().toISOString();
      this.patchCount += 1;
      return item.fields as T;
    }

    const itemMatch = path.match(/^\/sites\/([^/]+)\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch && request.method === "DELETE") {
      const list = this.requireList(itemMatch[2]);
      const index = list.items.findIndex((candidate) => candidate.id === itemMatch[3]);
      if (index < 0) throw new Error(`missing item ${itemMatch[3]}`);
      list.items.splice(index, 1);
      this.deleteCount += 1;
      return undefined as T;
    }

    throw new Error(`unexpected ${request.method} ${request.path}`);
  }

  private requireList(id: string): ListRecord {
    const list = this.lists.find((candidate) => candidate.id === id);
    if (!list) throw new Error(`missing list ${id}`);
    return list;
  }
}
