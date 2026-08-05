import React from 'react';
import { SelectableValue, getFieldDisplayName, StandardEditorProps} from '@grafana/data';
import { Combobox, Input, Label, MultiSelect, Select, Switch, useStyles2 } from '@grafana/ui';
import { AggregateFunctionType, MatrixOptions } from 'types';
import { css } from '@emotion/css';

type Props = StandardEditorProps<MatrixOptions>;

const getStyles = () => {
  return {
    dropWrap: css({
        marginBottom: 16
    }),
    label: css({
        paddingBottom: 2
    }),    
  };
};

export const MatrixOptionsEditor = (props: Props) => {
  
  const agregateFunctionOptions = 

  Object.keys(AggregateFunctionType)
  .filter(key => isNaN(Number(key))) // Filter out numeric keys
  .map(key => ({
    label: key,
    value: AggregateFunctionType[key as keyof typeof AggregateFunctionType], // Get the number
  }));

  const options: Array<SelectableValue<string>> = [];

  const context = props.context;
  const styles = useStyles2(getStyles);

  if (context && context.data) {
    for (const frame of context.data) {
      for (const field of frame.fields) {
        const name = getFieldDisplayName(field, frame, context.data);
        const value = getFieldDisplayName(field, frame, context.data);
        options.push({ value, label: name });
        }
      }
    }

  const onShowTotalsChanged = (v: boolean) => {
    props.onChange({
              RowGroups : props.value.RowGroups,
              ColumnGroups : props.value.ColumnGroups,
              DataField : props.value.DataField,
              AggregateFunction : props.value.AggregateFunction,
              ShowTotals: v,
              TimeUnit: props.value.TimeUnit 
            });
  };

  const onAggregateFunctionChanged = (v: AggregateFunctionType) => {
    props.onChange({
              RowGroups : props.value.RowGroups,
              ColumnGroups : props.value.ColumnGroups,
              DataField : props.value.DataField,
              AggregateFunction : v,
              ShowTotals: props.value.ShowTotals,
              TimeUnit: props.value.TimeUnit  
            });
  };  

  const onRowGroupsChanged = (v: SelectableValue<string>[]) => {
    
    const values = v.map(item => item.value!);

    props.onChange({
              RowGroups : values,
              ColumnGroups : props.value.ColumnGroups,
              DataField : props.value.DataField,
              AggregateFunction : props.value.AggregateFunction,
              ShowTotals: props.value.ShowTotals,
              TimeUnit: props.value.TimeUnit  
            });
  }; 

  const onColumnGroupsChanged = (v: SelectableValue<string>[]) => {
    
    const values = v.map(item => item.value!);

    props.onChange({
              RowGroups : props.value.RowGroups,
              ColumnGroups : values,
              DataField : props.value.DataField,
              AggregateFunction : props.value.AggregateFunction,
              ShowTotals: props.value.ShowTotals,
              TimeUnit: props.value.TimeUnit  
            });
            
  }; 

  const onDataFieldChanged = (v: string | undefined) => {

    props.onChange({
              RowGroups : props.value.RowGroups,
              ColumnGroups : props.value.ColumnGroups,
              DataField : v??'',
              AggregateFunction : props.value.AggregateFunction,
              ShowTotals: props.value.ShowTotals,
              TimeUnit: props.value.TimeUnit  
            });
            
  }; 

  const onTimeUnitChanged = (v: string | undefined) => {

    props.onChange({
              RowGroups : props.value.RowGroups,
              ColumnGroups : props.value.ColumnGroups,
              DataField : props.value.DataField,
              AggregateFunction : props.value.AggregateFunction,
              ShowTotals: props.value.ShowTotals,
              TimeUnit: v??''  
            });
            
  }; 

function filterOptions(options: SelectableValue<string>[], isGroupSelect : boolean): SelectableValue<string>[] | undefined {

        let selectedOptions : string[] = [...props.value.RowGroups, ...props.value.ColumnGroups];

        //i was really tired of this react effects/hooks/panel life cycle/events/grafana components/other mysterious shit
        //so its done in this way. its dumb, but it is simple and it does work
        if (isGroupSelect) {
            selectedOptions.push(props.value.DataField);
        }

        const awailableOptions = options.filter(item => !selectedOptions.includes(item.value??''));

        return awailableOptions;
    }

  return (
        <div>

            <div className={styles.dropWrap}>
                <Label className={styles.label}>
                    RowGroups
                </Label>                 
                <MultiSelect 
                id = "row-groups-select"
                options={filterOptions(options, true)} 
                value={props.value.RowGroups} 
                onChange={
                    (e) => 
                        {
                            onRowGroupsChanged(e);
                        }
                } 
                />
            </div> 

            <div className={styles.dropWrap}>
                <Label className={styles.label}>
                    ColumnGroups
                </Label>                 
                <MultiSelect 
                id = "column-groups-select"
                options={filterOptions(options, true)} 
                value={props.value.ColumnGroups} 
                onChange={
                    (e) => 
                        {
                            onColumnGroupsChanged(e);
                        }
                } 
                />
            </div> 

            <div className={styles.dropWrap}>
                <Label className={styles.label}>
                    DataField
                </Label>                 
                <Select 
                id = "data-field-select"
                options={filterOptions(options, false)} 
                value={props.value.DataField} 
                onChange={
                    (selectableValue) => 
                        {
                            onDataFieldChanged(selectableValue.value);
                        }
                } 
                />
            </div> 

            <div className={styles.dropWrap}>
                <Label className={styles.label}>
                    AggregateFunction
                </Label>                 
                <Combobox 
                id = "aggregate-function-select"
                options={agregateFunctionOptions} 
                value={props.value.AggregateFunction} 
                onChange={
                    (selectableValue) => 
                        {
                            onAggregateFunctionChanged(selectableValue.value ?? AggregateFunctionType.Avg);
                        }
                } 
                />
            </div> 

            <div className={styles.dropWrap}>  
                <Label className={styles.label}>
                    ShowTotals
                </Label>
                <Switch
                    data-testid = "ShowTotals"
                    id = "show-totals-switch"
                    value = {props.value.ShowTotals}
                    onChange={
                        (e) => {
                            onShowTotalsChanged(e.currentTarget.checked);
                        }
                    }
                />
            </div>     

            <div className={styles.dropWrap}>  
                <Label className={styles.label}>
                    TimeUnit
                </Label>
                <Input
                    id = "time-unit-input"
                    data-testid = "TimeUnit"
                    type = "text"
                    value = {props.value.TimeUnit}
                    placeholder='For example time:YYYY-MM-DD HH:mm:ss'
                    onChange={
                        (e) => {
                            onTimeUnitChanged(e.currentTarget.value);
                        }
                    }
                />
            </div>                 

        </div>    
    );
};