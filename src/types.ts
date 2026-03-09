export interface Widget {
  id: string;
  type: 'button' | 'slider' | 'input' | 'led' | 'label' | 'rect' | 'switch';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  caption?: string;
  color: string;
  varName: string;
  varType: 'int' | 'float' | 'bool' | 'String' | 'none';
  tabId?: string;
}

export interface Tab {
  id: string;
  name: string;
}
