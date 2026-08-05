import { SimpleOptions, AggregateFunctionType } from './types';
import { SimplePanel } from './components/SimplePanel';
import { PanelPlugin} from '@grafana/data';
import { MatrixOptionsEditor } from 'components/MatrixOptionsEditor';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)

.setPanelOptions((builder) => {
  return builder
    .addCustomEditor({
      id: 'matrixOptions',
      path: 'matrixOptions',
      name: 'MatrixOptions',
      editor: MatrixOptionsEditor,
      defaultValue: {
          RowGroups : [],
          ColumnGroups : [],
          DataField : '',
          AggregateFunction : AggregateFunctionType.Avg,
          ShowTotals: true 
        }
  });
});
