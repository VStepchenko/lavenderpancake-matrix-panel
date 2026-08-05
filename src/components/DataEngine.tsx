import { DataFrame, DataFrameView, Field, FieldType, toDataFrame } from "@grafana/data";
import { AggregateData, AggregateFunctionType, MatrixMember, MatrixOptions } from "types";

export class DataEngine {

  dataFrame: DataFrame;
  matrixOptions : MatrixOptions;
  groupedDataFrame : DataFrame;
  columnGroups : MatrixMember ;
  rowGroups : MatrixMember ;

  aggregatedData: {[key: string]: AggregateData} = {};

  aggKeySeparator = '-';
  wildCardKey = '*';

  constructor(dataFrame: DataFrame, matrixOptions : MatrixOptions) {
    this.dataFrame = dataFrame;
    this.matrixOptions = matrixOptions;
    this.groupedDataFrame = dataFrame; //temporary hack to avoid undefined in type definition
    this.columnGroups = MatrixMember.createRoot(); //dirty hack
    this.rowGroups = MatrixMember.createRoot(); //dirty hack
  }

  getAggKey(fields : Field<any>[], index : number): string {

    let result = '';

    for (let i = 0; i < fields.length; i++) {

        result = result + fields[i].values[index];

        if (i < (fields.length - 1) ){
            result = result + this.aggKeySeparator;
        }
    }

    return result;

  }

  createField(source : Field<any>) : Field<any> {

    const values: unknown[] = [];
    const field = { 
      name: source.name, 
      type: source.type, 
      values: values, 
      display : source.display, 
      config: {
        ...source.config,
      } 
    };

    const isTime = (source.type == FieldType.time);
    const hasTimeUnit = this.matrixOptions.TimeUnit;
    
    if (isTime && hasTimeUnit) {
      field.config.unit = this.matrixOptions.TimeUnit;
    }

    /* for possible later use
    if (source.type == FieldType.number) {
      field.config.decimals = 2;
    }
    */

    return field;
  }

  getAggregateValue(data : AggregateData) : number {

    switch (this.matrixOptions.AggregateFunction) {
    case AggregateFunctionType.Avg:
        return data.avg;
    case AggregateFunctionType.Count:
        return data.count;
    case AggregateFunctionType.Max:
        return data.max;
    case AggregateFunctionType.Min:
        return data.min;
    case AggregateFunctionType.Sum:
        return data.sum;                
}

  }

  agrregateRecords(indexes : number[]) : AggregateData{

    const dataField = this.dataFrame.fields.filter(item => this.matrixOptions.DataField === item.name)[0];
    
    const result : AggregateData = {min : 0, max : 0, avg : 0, sum : 0, count : 0};

    result.min = Number.MAX_SAFE_INTEGER;
    result.max = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < indexes.length; i++) {

      let value = dataField.values[indexes[i]];

      result.count++;
      result.sum += value;

      if (value < result.min)
        result.min = value;

      if (value > result.max)
        result.max = value;
    }

    result.avg = result.sum / result.count;

    return result;

  }

  processGroupedDataItem(row : any, matrixMember : MatrixMember, fields : Field<any>[], depth : number) {

    if (depth > fields.length - 1) {
      return;
    }

    const currentField = fields[depth];
    const tmpMatrixMember : MatrixMember = MatrixMember.createRegular(currentField.name, row[currentField.name], currentField);

    const mm = matrixMember.matrixMembers.find(i => matrixMemberComparerFunction(i, tmpMatrixMember) == 0);
    depth++;

    if (mm) {
      this.processGroupedDataItem(row, mm, fields, depth);
    } else {
      matrixMember.matrixMembers.push(tmpMatrixMember);
      this.processGroupedDataItem(row, tmpMatrixMember, fields, depth);
    }

  }

  createTablixMemberHierarchy(groups : string[]) : MatrixMember {

    const groupedData = this.groupedDataFrame;

    const fields = groupedData.fields.filter(item => groups.some(rg => rg === item.name));

    const result : MatrixMember = MatrixMember.createRoot();

    const view = new DataFrameView(groupedData);
    view.forEach((row) => {
        this.processGroupedDataItem(row, result, fields, 0);
    });

    return result;

  }

  sortMatrixMembers(matrixMember : MatrixMember) {
    matrixMember.matrixMembers.sort(matrixMemberComparerFunction);
    matrixMember.matrixMembers.forEach((mm) => this.sortMatrixMembers(mm));
  }

  initialize() {

    this.groupedDataFrame = this.groupDataFrame();
    this.createColumnRowHierarchy();

  }

  createColumnRowHierarchy() {

    const colMembers = this.createTablixMemberHierarchy(this.matrixOptions.ColumnGroups);
    const rowMembers = this.createTablixMemberHierarchy(this.matrixOptions.RowGroups);

    this.sortMatrixMembers(colMembers);
    this.sortMatrixMembers(rowMembers);

    if (this.matrixOptions.ShowTotals) {
      this.addTotals(colMembers);
      this.addTotals(rowMembers);
    }

    this.columnGroups = colMembers;
    this.rowGroups = rowMembers;
  }

  addTotals(matrixMember: MatrixMember) {
    
    if (matrixMember.matrixMembers.length == 0) {
      return;
    }

    for (let i=0; i < matrixMember.matrixMembers.length; i++) {
      const mm = matrixMember.matrixMembers[i];
      this.addTotals(mm);
    }

    this.addTotal(matrixMember);
  }

  addTotal(matrixMember: MatrixMember) {
    
    const total : MatrixMember = MatrixMember.createTotal();

    matrixMember.matrixMembers.push(total);

    const depth = this.getDepth(matrixMember);
    this.addEmptyMembers(total, depth);
  }

  addEmptyMembers(total: MatrixMember, depth: number) {
    
    if (depth == 1) {
      return;
    }

    depth--;

    const empty : MatrixMember = MatrixMember.createEmpty();   

    total.matrixMembers.push(empty);

    this.addEmptyMembers(empty, depth);

  }

  getDepth (matrixMember: MatrixMember) : number {

    let result = 0;

    if (matrixMember.matrixMembers.length > 0) {
      const child = matrixMember.matrixMembers[0];
      result++;
      result += this.getDepth(child);
    }

    return result;
  }

  groupDataFrame(): DataFrame {

    const rowFields = this.matrixOptions.RowGroups.map(cg => this.dataFrame.fields.find(f => f.name === cg)!);
    const colFields = this.matrixOptions.ColumnGroups.map(cg => this.dataFrame.fields.find(f => f.name === cg)!);
    const dataField = this.dataFrame.fields.find(f => f.name === this.matrixOptions.DataField)!;

    const groupIndexData: {[key: string]: number[]} = {};
    for (let i = 0; i < this.dataFrame.length; i++) {

        const rowKey = this.getAggKey(rowFields, i);
        const colKey = this.getAggKey(colFields, i);
        const tmpAggKey = rowKey + this.aggKeySeparator + colKey;

        if (tmpAggKey in groupIndexData) {
          const value = groupIndexData[tmpAggKey];
          value.push(i);
        }
        else{
          const tmpArray: number[] = [];
          tmpArray.push(i);
          groupIndexData[tmpAggKey] = tmpArray;
        }
    }

    Object.entries(groupIndexData).forEach(([key, value]) => {
      
      const aggData = this.agrregateRecords(value);
      this.aggregatedData[key] = aggData;

    });

    //create totally new frame with aggregated data only
    //where shoud be rows values, columns values, aggKey, aggData
    //indexes MUST correspond

    const aggKeyValues: string[] = [];
    const aggDataValues: number[] = [];

    const dataFieldReduced = this.createField(dataField); //do we need it?

    const rowFieldsReduced : Field<any>[] = [];
    const colFieldsReduced : Field<any>[] = [];

    for (let i = 0; i < rowFields.length; i++){
      const rowField = rowFields[i];
      const rowFieldReduced = this.createField(rowField);
      rowFieldsReduced.push(rowFieldReduced);
    }

    for (let i = 0; i < colFields.length; i++){
      const colField = colFields[i];
      const colFieldReduced = this.createField(colField);
      colFieldsReduced.push(colFieldReduced);
    }

    Object.entries(this.aggregatedData).forEach(([key, value]) => {

      aggKeyValues.push(key);
      aggDataValues.push(this.getAggregateValue(value));
      
      //indexes (actually we need the only first one, to get row and column values)
      const index = groupIndexData[key][0];

      const dataValue = dataField.values[index];
      dataFieldReduced.values.push(dataValue);

      for (let i = 0; i < rowFields.length; i++){
        const rowDataValue = rowFields[i].values[index];
        rowFieldsReduced[i].values.push(rowDataValue);
      }

      for (let i = 0; i < colFields.length; i++){
        const colDataValue = colFields[i].values[index];
        colFieldsReduced[i].values.push(colDataValue);
      }

    });    

    const aggKeyField = { name: 'AggKey', type: FieldType.string, values: aggKeyValues, display : dataField.display }
    const aggDataField = { name: 'AggData', type: FieldType.number, values: aggDataValues, display : dataField.display }

    const groupedFields = [...rowFieldsReduced, ...colFieldsReduced, dataFieldReduced, aggKeyField, aggDataField];

    const frameAgg = toDataFrame({
        name: 'groupedData',
        fields: groupedFields,
        });    

    return frameAgg;
  }
}

function matrixMemberComparerFunction(a: MatrixMember, b: MatrixMember): number {

    

    const valA = a.value;
    const valB = b.value;
    const ascending = true;

    // 1. Handle identical values
    if (valA === valB) return 0;

    // 2. Handle null/undefined (push to the bottom)
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    // 3. Compare Numbers
    if (typeof valA === 'number' && typeof valB === 'number') {
      return ascending ? valA - valB : valB - valA;
    }

    // 4. Compare Dates
    if (valA instanceof Date && valB instanceof Date) {
      return ascending ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    }

    // 5. Compare Strings (case-insensitive, handles accents)
    if (typeof valA === 'string' && typeof valB === 'string') {
      const comparison = valA.localeCompare(valB);
      return ascending ? comparison : -comparison;
    }

    // 6. Fallback for Booleans or mismatched/unknown types
    const strA = String(valA);
    const strB = String(valB);
    return ascending ? strA.localeCompare(strB) : strB.localeCompare(strA);
}


