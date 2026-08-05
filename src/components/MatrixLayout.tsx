import { AggregateData, MatrixMember, MatrixMemberType, MatrixOptions } from "types";
import { DataEngine } from "./DataEngine";
import { DataFrameView, FieldType, getDisplayProcessor } from "@grafana/data";
import { useTheme2 } from "@grafana/ui";

export class LayoutGenerator {

  dataEngine: DataEngine;
  matrixOptions: MatrixOptions;
  rowIndex: {[key: string]: string[]} = {};
  colIndex: {[key: string]: string[]} = {};

  constructor(dataEngine: DataEngine, matrixOptions: MatrixOptions) {
    this.dataEngine = dataEngine;
    this.matrixOptions = matrixOptions;
  }

  processColumnGroup(matrixLayout: MatrixLayout, matrixMember: MatrixMember, depth: number) {

    let row = matrixLayout.MatrixRows[depth];
    if (!row) {
        return;
    }
    depth++;
    for (let k = 0; k < matrixMember.matrixMembers.length; k++) {
            
        let mm = matrixMember.matrixMembers[k];
        let cell = this.createMatrixCellFormatted(mm);
        cell.colSpan = mm.leafCount();
        cell.isGroup = true;
        row.MatrixCells.push(cell);

        this.processColumnGroup(matrixLayout, mm, depth);
    }    

  }

  processRowGroup(matrixLayout: MatrixLayout, matrixMember: MatrixMember, gap: number) {

    let colGroupsCount = this.matrixOptions.ColumnGroups.length;

    let idx = gap;

    for (let k = 0; k < matrixMember.matrixMembers.length; k++) {

        let mm = matrixMember.matrixMembers[k];
        let rowSpan = mm.leafCount();
        let row = matrixLayout.MatrixRows[colGroupsCount + idx];

        let cell = this.createMatrixCellFormatted(mm);
        cell.rowSpan = rowSpan;
        cell.isGroup = true;
        row.MatrixCells.push(cell);

        this.processRowGroup(matrixLayout, mm, idx);

        idx += rowSpan;
    }    
  }

  createLayout (): MatrixLayout {

    let colCount = this.dataEngine.columnGroups.leafCount();
    let rowCount = this.dataEngine.rowGroups.leafCount();

    let colGroupsCount = this.matrixOptions.ColumnGroups.length;
    let rowGroupsCount = this.matrixOptions.RowGroups.length;

    const result = new MatrixLayout();

    //create spanned corner
    for (let i = 0; i < colGroupsCount; i++) {
        let row = new MatrixRow();
        result.MatrixRows.push(row);
    }

    result.MatrixRows[0].MatrixCells[0] = new MatrixCell(undefined);
    result.MatrixRows[0].MatrixCells[0].colSpan = rowGroupsCount;
    result.MatrixRows[0].MatrixCells[0].rowSpan = colGroupsCount;
    result.MatrixRows[0].MatrixCells[0].isCorner = true;

    //create column groups
    this.processColumnGroup(result, this.dataEngine.columnGroups, 0);

    //create row groups
    for (let i = 0; i < rowCount; i++) {
        let row = new MatrixRow();
        result.MatrixRows.push(row);
    }
    this.processRowGroup(result, this.dataEngine.rowGroups, 0);

    const bodyCells: DataCell[][] = [];

    this.createIndexes();
    this.initBodyCells(bodyCells);
    this.setColumnGroups(bodyCells);
    this.setRowGropus(bodyCells);    
    this.processDataCells(bodyCells); 

    //create body cells
    for (let i = 0; i < rowCount; i++) {
        let row = result.MatrixRows[i + colGroupsCount];
        
        for (let k = 0; k < colCount; k++) {
            const dataCell = bodyCells[i][k];
            const cell = new MatrixCell(dataCell.value);
            cell.isTotal = dataCell.isTotal;
            row.MatrixCells.push(cell);
        }
    }

    return result;
    //return this.createDummyLayout();

  }

    createAggKey(matrixMembers: MatrixMember[]): string {
        
        let result = '';

        for (let i = 0; i < matrixMembers.length; i++) {

            const value = matrixMembers[i].type == MatrixMemberType.Regular ? matrixMembers[i].value: this.dataEngine.wildCardKey;
            result = result + value;

            if (i < (matrixMembers.length - 1) ){
                result = result + this.dataEngine.aggKeySeparator;
            }
        }

        return result;
    }

    processDataCells(bodyCells: DataCell[][]) {
        let rowCount = this.dataEngine.rowGroups.leafCount();
        let colCount = this.dataEngine.columnGroups.leafCount();
        
        for (let i = 0; i < rowCount; i++) {
            for (let j = 0; j < colCount; j++) {
                const bodyCell = bodyCells[i][j];

                const rowKey = this.createAggKey(bodyCell.RowGroups);
                const colKey = this.createAggKey(bodyCell.ColumnGroups);
                const fullKey = rowKey + this.dataEngine.aggKeySeparator + colKey;

                const data = this.dataEngine.aggregatedData[fullKey];
                if (data) {
                    bodyCell.value = this.dataEngine.getAggregateValue(data);
                }
                else {
                    //maybe we need some option here
                }

                //actually we can use the following even for 'regular' datacells
                const isColTotal = bodyCell.ColumnGroups.some(cg => cg.type == MatrixMemberType.Total);
                const isRowTotal = bodyCell.RowGroups.some(cg => cg.type == MatrixMemberType.Total);
                const isTotal = isColTotal || isRowTotal;
                if (isTotal) {
                    const dataCells = this.getNaive(bodyCell.ColumnGroups, bodyCell.RowGroups);
                    const totalData = this.mergeAggregateData(dataCells);
                    const totalValue = this.dataEngine.getAggregateValue(totalData);
                    bodyCell.value = dataCells.length > 0 ? totalValue: undefined;
                    bodyCell.isTotal = true;
                }
            }
        }
    }

    createIndexes() {
        
        const view = new DataFrameView(this.dataEngine.groupedDataFrame);
        view.forEach((row) => {

            const rowGroupValues = this.matrixOptions.RowGroups.map(rg => row[rg]);
            const rowGroupKeys = this.createPossibleKeys(rowGroupValues);

            rowGroupKeys.forEach((key) => {

                if (key in this.rowIndex) {
                    const value = this.rowIndex[key];
                    value.push(row["AggKey"]);
                }
                else{
                    const tmpArray: any[] = [];
                    tmpArray.push(row["AggKey"]);
                    this.rowIndex[key] = tmpArray;
                }
            })

            const colGroupValues = this.matrixOptions.ColumnGroups.map(rg => row[rg]);
            const colGroupKeys = this.createPossibleKeys(colGroupValues);

            colGroupKeys.forEach((key) => {

                if (key in this.colIndex) {
                    const value = this.colIndex[key];
                    value.push(row["AggKey"]);
                }
                else{
                    const tmpArray: any[] = [];
                    tmpArray.push(row["AggKey"]);
                    this.colIndex[key] = tmpArray;
                }
            })            
        })
    }

    createPossibleKeys(values: any[]): string[] {

        const result: string[] = [];
        const count = values.length;
        const wildCards = Array.from({ length: count }, () => this.dataEngine.wildCardKey);

        for (let i = 0; i < values.length; i++) {
            const countLeft = i + 1;
            const countRight = count - i - 1;
            let val = values.slice(0, countLeft);
            let wild = wildCards.slice(0, countRight);
            let tmp = [...val, ...wild];
            let res = tmp.join(this.dataEngine.aggKeySeparator);
            result.push(res);
        }        
        const allWild = wildCards.slice(0, count).join(this.dataEngine.aggKeySeparator);
        result.push(allWild);

        return result;

    }

    getIndexed(cols: MatrixMember[], rows: MatrixMember[]): AggregateData[] {
        
        const result: AggregateData[] = [];

        const rowKey = this.createAggKey(rows);
        const colKey = this.createAggKey(cols);
        const rowData = this.rowIndex[rowKey];
        const colData = this.colIndex[colKey];

        if ((!rowData) || (!colData)) {
            return result;
        }

        const keys = rowData.reduce<string[]>((acc, row) => {
            const match = colData.find(col => col === row);
            if (match) {
                acc.push(row);
            }
            return acc;
        }, []);

        const data = keys.map(i => this.dataEngine.aggregatedData[i]);

        return data;
    }

    getNaive(cols: MatrixMember[], rows: MatrixMember[]): AggregateData[] {

        const result: AggregateData[] = [];

        const view = new DataFrameView(this.dataEngine.groupedDataFrame);
        view.forEach((row) => {

            let match = true;

            for (let i = 0; i < cols.length; i++) {
                const mm = cols[i];
                const value = row[mm.name];

                if ((mm.type == MatrixMemberType.Total) || (mm.type == MatrixMemberType.Empty)) {
                    break;
                }

                if (value !== mm.value) {
                    match = false;
                }
            }

            for (let i = 0; i < rows.length; i++) {
                const mm = rows[i];
                const value = row[mm.name];

                if ((mm.type == MatrixMemberType.Total) || (mm.type == MatrixMemberType.Empty)) {
                    break;
                }

                if (value !== mm.value) {
                    match = false;
                }
            }

            if (match) {
                const aggKey = row["AggKey"];
                const aggData = this.dataEngine.aggregatedData[aggKey];
                result.push(aggData);
            }
        });

        return result;
    }

    mergeAggregateData(data: AggregateData[]): AggregateData {

        const result: AggregateData = {min: 0, max: 0, avg: 0, sum: 0, count: 0};

        result.min = Number.MAX_SAFE_INTEGER;
        result.max = Number.MIN_SAFE_INTEGER;

        for (let i = 0; i < data.length; i++) {

            let value = data[i];

            result.count += value.count;
            result.sum += value.sum;

            if (value.min < result.min) {
                result.min = value.min;
            }

            if (value.max > result.max) {
                result.max = value.max;
            }
        }

        result.avg = result.sum / result.count;

        return result;
    }

    private initBodyCells(bodyCells: DataCell[][]) {
        let rowCount = this.dataEngine.rowGroups.leafCount();
        let colCount = this.dataEngine.columnGroups.leafCount();
        
        for (let i = 0; i < rowCount; i++) {
            const row: DataCell[] = [];
            bodyCells.push(row);
            for (let j = 0; j < colCount; j++) {
                bodyCells[i][j] = new DataCell("");
            }
        }
    }

    private setColumnGroups(bodyCells: DataCell[][]) {
        
        let rowCount = this.dataEngine.rowGroups.leafCount();
        let currentMatrixMembers = this.dataEngine.columnGroups.matrixMembers;

        while (currentMatrixMembers.length > 0) {
            let tempMatrixMembers: MatrixMember[] = [];
            let idx = 0;
            for (let i = 0; i < currentMatrixMembers.length; i++) {
                let mm = currentMatrixMembers[i];
                let leafCount = mm.leafCount();

                for (let k = 0; k < leafCount; k++) {
                    for (let m = 0; m < rowCount; m++) {
                        bodyCells[m][k + idx].ColumnGroups.push(mm);
                    }
                }

                idx += leafCount;
                tempMatrixMembers.push(...mm.matrixMembers);
            }
            currentMatrixMembers = tempMatrixMembers;
        }
    }

    private setRowGropus(bodyCells: DataCell[][]) {
        
        let colCount = this.dataEngine.columnGroups.leafCount();
        let currentMatrixMembers = this.dataEngine.rowGroups.matrixMembers;
        while (currentMatrixMembers.length > 0) {
            let tempMatrixMembers: MatrixMember[] = [];
            let idx = 0;
            for (let i = 0; i < currentMatrixMembers.length; i++) {
                let mm = currentMatrixMembers[i];
                let leafCount = mm.leafCount();

                for (let k = 0; k < leafCount; k++) {
                    for (let m = 0; m < colCount; m++) {
                        bodyCells[k + idx][m].RowGroups.push(mm);
                    }
                }

                idx += leafCount;
                tempMatrixMembers.push(...mm.matrixMembers);
            }
            currentMatrixMembers = tempMatrixMembers;
        }
        return currentMatrixMembers;
    }

  createDummyLayout (): MatrixLayout {

    const result = new MatrixLayout();

    const r1 = new MatrixRow();
    const r2 = new MatrixRow();

    const c11 = new MatrixCell("A");
    const c12 = new MatrixCell(10);
    const c13 = new MatrixCell(13);

    const c21 = new MatrixCell("BBB");
    const c22 = new MatrixCell(223);
    //const c23 = new MatrixCell(12);    

    c22.colSpan = 2;

    r1.MatrixCells.push(c11, c12, c13);
    r2.MatrixCells.push(c21, c22);

    result.MatrixRows.push(r1, r2);

    return result;

  }

    createMatrixCellFormatted(matrixMember: MatrixMember): MatrixCell {
        
        let value = matrixMember.value;

        const isTime = (matrixMember.field) && (matrixMember.field.type == FieldType.time);
        const hasTimeUnit = (matrixMember.field) && (matrixMember.field.config.unit);

        if (isTime && hasTimeUnit) {
            const theme = useTheme2();
            const dop = { field: matrixMember.field!, theme:  theme };
            const dp = getDisplayProcessor(dop);
            const formattedvalue = dp(matrixMember.value);
            value = formattedvalue.text;
        }

        const result = new MatrixCell(value);

        return result;
    }

}

export class MatrixLayout {

    MatrixRows: MatrixRow[] = [];

}

export class MatrixRow {

    MatrixCells: MatrixCell[] = [];

}

export class MatrixCell {

    colSpan: number = 1;
    rowSpan: number = 1;
    value: any;
    isTotal: boolean = false;
    isCorner: boolean = false;
    isGroup: boolean = false;

    constructor (value: any) {
        this.value = value;
    }

    toString(): string {
        return `V: ${this.value}; CS: ${this.colSpan}; RS: ${this.rowSpan}`;
    }

}

class DataCell {

    ColumnGroups: MatrixMember [] = []
    RowGroups: MatrixMember [] = []

    value: any;
    isTotal: boolean = false;

    constructor (value: any) {
        this.value = value;
    }

    toString(): string {
        return `${this.value}`;
    }
}