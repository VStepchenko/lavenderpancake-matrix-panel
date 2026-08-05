import { Field } from "@grafana/data";

export enum AggregateFunctionType
{
  Sum,
  Max,
  Min,
  Avg,
  Count
}

export interface MatrixOptions{
  RowGroups: string[];
  ColumnGroups: string[];
  DataField: string;
  AggregateFunction: AggregateFunctionType;
  ShowTotals: boolean;
  TimeUnit: string;
}

export interface SimpleOptions {
  matrixOptions: MatrixOptions;
}

export interface AggregateData {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

export enum MatrixMemberType
{
  Root,
  Total,
  Empty,
  Regular
}

export class MatrixMember {
  
  name: string;
  type: MatrixMemberType;
  value: unknown;
  matrixMembers: MatrixMember[];
  field?: Field;

  constructor (name: string, type: MatrixMemberType, value: unknown) {
    this.name = name;
    this.type = type;
    this.value = value;
    this.matrixMembers = [];
  }

  leafCount(): number {
    
    if (this.matrixMembers.length === 0) {
        return 1;
    }

    let result = 0;
    this.matrixMembers.map((mm) => result += mm.leafCount());

    return result;

  }

  static createTotal(): MatrixMember {

    const result = new MatrixMember("Total", MatrixMemberType.Total, "Total");

    return result;

  }

  static createEmpty(): MatrixMember {

    const result = new MatrixMember("Empty", MatrixMemberType.Empty, undefined);

    return result;

  }

  static createRoot(): MatrixMember {

    const result = new MatrixMember("Root", MatrixMemberType.Root, undefined);

    return result;

  }

  static createRegular(name: string, value: unknown, field: Field): MatrixMember {

    const result = new MatrixMember(name, MatrixMemberType.Regular, value);
    result.field = field;

    return result;

  }  

}
