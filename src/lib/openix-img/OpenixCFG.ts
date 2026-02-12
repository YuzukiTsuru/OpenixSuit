import { ValueType, Variable, Group } from './types';

export class OpenixCFG {
  private groups: Map<string, Group> = new Map();
  private variables: Map<string, Variable> = new Map();
  private groupOrder: string[] = [];

  parseFromData(data: Uint8Array): boolean {
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(data);
    return this.parseFromContent(content);
  }

  parseFromContent(content: string): boolean {
    this.groups.clear();
    this.variables.clear();
    this.groupOrder = [];

    const lines = content.split(/\r?\n/);
    let currentGroup: Group | null = null;

    for (let line of lines) {
      line = line.trim();

      if (line.length === 0 || line[0] === ';' || line[0] === '#') {
        continue;
      }

      if (line[0] === '[') {
        const groupName = this.parseGroupName(line);
        if (groupName) {
          currentGroup = { name: groupName, variables: [] };
          this.groups.set(groupName, currentGroup);
          this.groupOrder.push(groupName);
        }
      } else if (line[0] === '{') {
        if (currentGroup) {
          const listItem = this.parseListItem(line);
          if (listItem) {
            currentGroup.variables.push(listItem);
          }
        }
      } else if (/[a-zA-Z_]/.test(line[0])) {
        if (currentGroup) {
          const variable = this.parseKeyValue(line);
          if (variable) {
            currentGroup.variables.push(variable);
            this.variables.set(variable.name, variable);
          }
        }
      }
    }

    return this.groups.size > 0;
  }

  private parseGroupName(line: string): string | null {
    const start = line.indexOf('[');
    const end = line.indexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return line.substring(start + 1, end).trim();
  }

  private parseKeyValue(line: string): Variable | null {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return null;

    const name = line.substring(0, eqIndex).trim();
    const valueStr = line.substring(eqIndex + 1).trim();

    const variable: Variable = { name, type: ValueType.STRING };

    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      variable.type = ValueType.STRING;
      variable.stringValue = this.parseStringValue(valueStr);
    } else if (/^0x[0-9a-fA-F]+$/i.test(valueStr)) {
      variable.type = ValueType.NUMBER;
      variable.numberValue = parseInt(valueStr, 16);
    } else if (/^-?\d+$/.test(valueStr)) {
      variable.type = ValueType.NUMBER;
      variable.numberValue = parseInt(valueStr, 10);
    } else {
      variable.type = ValueType.REFERENCE;
      variable.stringValue = valueStr;
    }

    return variable;
  }

  private parseStringValue(value: string): string {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  }

  private parseListItem(line: string): Variable | null {
    if (!line.startsWith('{')) return null;

    const listItem: Variable = {
      name: '',
      type: ValueType.LIST_ITEM,
      items: [],
    };

    let content = line.substring(1);
    if (content.endsWith('}')) {
      content = content.slice(0, -1);
    }

    const items = this.parseListItems(content);
    listItem.items = items;

    return listItem;
  }

  private parseListItems(content: string): Variable[] {
    const items: Variable[] = [];
    const parts = content.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length === 0) continue;

      const variable = this.parseKeyValue(trimmed);
      if (variable) {
        items.push(variable);
      }
    }

    return items;
  }

  findGroup(name: string): Group | null {
    return this.groups.get(name) || null;
  }

  findVariable(name: string): Variable | null {
    return this.variables.get(name) || null;
  }

  findVariableInGroup(name: string, groupName: string): Variable | null {
    const group = this.groups.get(groupName);
    if (!group) return null;

    return group.variables.find((v) => v.name === name) || null;
  }

  getNumber(name: string): number | null {
    const variable = this.variables.get(name);
    if (variable && variable.type === ValueType.NUMBER) {
      return variable.numberValue ?? null;
    }
    return null;
  }

  getString(name: string): string | null {
    const variable = this.variables.get(name);
    if (variable && (variable.type === ValueType.STRING || variable.type === ValueType.REFERENCE)) {
      return variable.stringValue ?? null;
    }
    return null;
  }

  countVariables(groupName: string): number {
    const group = this.groups.get(groupName);
    return group ? group.variables.length : 0;
  }

  getGroups(): Map<string, Group> {
    return this.groups;
  }

  getGroupOrder(): string[] {
    return this.groupOrder;
  }
}
