import { FieldType, PanelData } from "@grafana/data";
import { MatrixOptions } from "types";

export class Validator {

  static validateMatrixOptions(matrixOptions : MatrixOptions): string {
    
    let result = '';

    if (matrixOptions.ColumnGroups.length == 0) {
        result += 'Column groups must contain at least one field; ';
    }

    if (matrixOptions.RowGroups.length == 0) {
        result += 'Row groups must contain at least one field; ';
    }

    if (!matrixOptions.DataField) {
        result += 'Data field must be set; ';
    }

    return result;

  }

  static validateDataField(matrixOptions : MatrixOptions, data : PanelData): string {
    
    let result = '';

    const frame = data.series[0];
    const dataField = frame.fields.find(f => f.name === matrixOptions.DataField);

    if ((dataField) && (dataField.type != FieldType.number)) {
        result += 'Data field must be number';
    }

    return result;

  }  

  static validateDataSeries(data : PanelData): string {
    
    let result = '';

    if (data.series.length === 0) {
        result += 'There is no data';
    }

    return result;

  }   

  private static readonly noDataWarning = 'There is no data';

  private static readonly dataFieldTypeWarning = 'Data field must be number';

  private static readonly columnGroupsFieldWarning = 'Column groups must contain at least one field';

  private static readonly rowGroupsFieldWarning = 'Row groups must contain at least one field';

  private static readonly dataFieldWarning = 'Data field must be set';

  static validate(matrixOptions : MatrixOptions, data : PanelData) : string[] {

    const result : string[] = [];

    if (data.series.length === 0) {
        result.push(Validator.noDataWarning);
    }

    const frame = data.series[0];
    if (frame) {
      const dataField = frame.fields.find(f => f.name === matrixOptions.DataField);

      if ((dataField) && (dataField.type != FieldType.number)) {
          result.push(Validator.dataFieldTypeWarning);
      }
    }

    if (matrixOptions.ColumnGroups.length == 0) {
        result.push(Validator.columnGroupsFieldWarning);
    }

    if (matrixOptions.RowGroups.length == 0) {
        result.push(Validator.rowGroupsFieldWarning);
    }

    if (!matrixOptions.DataField) {
        result.push(Validator.dataFieldWarning);
    }

    return result;
  }  
}