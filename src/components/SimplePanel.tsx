import React from 'react';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { Alert, useStyles2} from '@grafana/ui';
import { PanelProps} from '@grafana/data';
import { CustomTable } from './CustomTable';
import { DataEngine } from './DataEngine';
import { LayoutGenerator } from './MatrixLayout';
import { Validator } from './Validator';

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
  };
};

export const SimplePanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, id }) => {
  const styles = useStyles2(getStyles);

  let validation = Validator.validate(options.matrixOptions, data);

  let validationElement = validation.map((message: string) => {
        return (    
          <Alert 
            title={'Warning'} 
            severity="warning">
            {message}
          </Alert>
        );
      });

  if (validation.length > 0) {
    return validationElement;
  }

  const frame = data.series[0];

  let dataEngine = new DataEngine(frame, options.matrixOptions);
  let layoutGenerator = new LayoutGenerator(dataEngine, options.matrixOptions);

  //console.log("Before:"+new Date().toISOString());

  dataEngine.initialize();
  let layout = layoutGenerator.createLayout();

  //console.log("After:"+new Date().toISOString());

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <CustomTable 
        width={width}
        height={height}
        layout = {layout}
      />

    </div>
  );
};
