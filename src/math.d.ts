declare module 'mathjs' {
  export interface Matrix {
    toArray(): any[];
    valueOf(): any;
  }

  export function matrix(data: any[]): Matrix;
  export function add(a: any, b: any): any;
  export function subtract(a: any, b: any): any;
  export function multiply(a: any, b: any): any;
  export function transpose(a: any): any;
  export function identity(n: number): Matrix;
  export function norm(a: any): number;
  export function inv(matrix: Matrix): Matrix;
}
