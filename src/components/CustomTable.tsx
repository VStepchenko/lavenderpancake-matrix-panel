import React from 'react';
import { ScrollContainer, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { MatrixLayout } from './MatrixLayout';

const getStyles = (theme: GrafanaTheme2) => ({

  table: css`

    td.high {
      background: ${theme.colors.background.elevated};
      font-weight: ${theme.typography.fontWeightBold};
      font-size: ${theme.typography.h4.fontSize};
    }

    td.total {
      background: ${theme.colors.background.elevated};
    }

    table {
      border-collapse: collapse;

      th,
      td {
        padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
        border-top: 1px solid ${theme.colors.border.medium};
        border-left: 1px solid ${theme.colors.border.medium};
      }

      th {
        font-weight: ${theme.typography.fontWeightMedium};
        background: ${theme.colors.background.secondary};
      }

      border-bottom: 1px solid ${theme.colors.border.medium};
      border-right: 1px solid ${theme.colors.border.medium};
    }

  `,
});

interface CustomTableProps{
  width: number;
  height: number;
  layout: MatrixLayout;
}

export const CustomTable = (props: CustomTableProps) => {

  const styles = useStyles2(getStyles);

  return ( 
  
    <ScrollContainer>
    <div className={styles.table}>
        <table width={props.width - 12} data-testid = "table">

        {props.layout.MatrixRows.map((row, idx) => 
          <tr key={idx}>
            {
              row.MatrixCells.map((cell, idx) => 
                <td 
                  key={idx}
                  colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}  
                  rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                  className = {cell.isTotal ? 'total' : undefined}
                >{cell.value}</td>
              )
            }
          </tr>
        )}

        </table>
    </div>
    </ScrollContainer>

  )
};
