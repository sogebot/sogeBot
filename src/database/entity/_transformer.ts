/// ColumnNumericTransformer
export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

export class ColumnStringTransformer {
  to(data: string): string {
    return data;
  }
  from(data: number): string {
    return String(data).trim();
  }
}

export class SafeNumberTransformer {
  to(data: number | undefined): number | undefined {
    if (data) {
      return data <= Number.MAX_SAFE_INTEGER
        ? data
        : Number.MAX_SAFE_INTEGER;
    } else {
      return data;
    }
  }
  from(data: number | string): number {
    if (typeof data === 'string') {
      data =  parseFloat(data);
    }
    return data <= Number.MAX_SAFE_INTEGER
      ? data
      : Number.MAX_SAFE_INTEGER;
  }
}