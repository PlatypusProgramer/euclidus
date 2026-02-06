declare module 'mathjs' {
  export interface Matrix {
    toArray(): any[];
    valueOf(): any;
  }

  export function matrix(data: any[]): Matrix;
  export function multiply(a: any, b: any): any;
  export function inv(matrix: Matrix): Matrix;
}
