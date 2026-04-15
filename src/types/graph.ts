/* ================================================================
   INTEGRECO TYPE DEFINITIONS
   All interfaces reflect the actual runtime data model.
================================================================ */

interface INode {
  id: number;
  type: 'node' | 'root' | 'note' | 'group' | 'multi';
  x: number;
  y: number;
  label: string;
  note?: string;
  color?: string;
  locked?: boolean;
  collapsed?: boolean;
  updatedAt?: number;

  // Group / Multi dimensions
  width?: number;
  height?: number;
  nodes?: number[];

  // Node style
  style?: INodeStyle;

  // Group background
  bg?: IGroupBg;

  // Map background (root nodes only)
  mapBg?: IMapBg;
}

interface INodeStyle {
  shape?: 'pill' | 'round' | 'rect';
  borderType?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  padding?: number;
  opacity?: number;
  blur?: number;
}

interface IEdge {
  id: number;
  from: number;
  to: number;
  shape?: 'straight' | 'bezier' | 'elbow';
  dash?: 'solid' | 'dashed' | 'dotted' | 'link';
  width?: number;
  color?: string;
  dir?: 'forward' | 'backward' | 'both' | 'none';
  cp1x: number | null;
  cp1y: number | null;
  cp2x: number | null;
  cp2y: number | null;
  bend?: number;
  collapsed?: boolean;
  isLink?: boolean;
  label?: string;

  // Fixation (snap to border)
  fromSide?: string | null;
  fromOffset?: number | null;
  fromFixed?: boolean;
  toSide?: string | null;
  toOffset?: number | null;
  toFixed?: boolean;
}

interface IBgSettings {
  color: string;
  lastColor: string;
  pattern: 'none' | 'dots' | 'grid' | 'rough' | 'paper';
  patOpacity: number;
  patBlur: number;
  patScale: number;
  image: string | null;
  imgEnabled: boolean;
  imgOpacity: number;
  imgBlur: number;
  recentColors: string[];
}

interface IGroupBg {
  color?: string;
  recentColors?: string[];
  pattern?: string;
  patScale?: number;
  patOpacity?: number;
  patBlur?: number;
  titleColor?: string;
  titleOpacity?: number;
  titleCollapsed?: boolean;
  opacity?: number;
  image?: string;
  imgEnabled?: boolean;
  imgOpacity?: number;
  imgBlur?: number;
}

interface IMapBg {
  image?: string;
  imgEnabled?: boolean;
  imgOpacity?: number;
  imgBlur?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

interface ISnapSettings {
  node: boolean;  nodeAdaptive: boolean;
  note: boolean;  noteAdaptive: boolean;
  group: boolean; groupAdaptive: boolean;
  multi: boolean; multiAdaptive: boolean;
  [key: string]: boolean;
}

interface IEdgeDefaults {
  shape: string;
  dash: string;
  width: number;
  dir: string;
  color: string | null;
}

interface INodeDefaults {
  style: INodeStyle;
  recentColors: string[];
}

interface IGroupDefaults {
  bg: IGroupBg;
}

interface IUiSettings {
  btnOpa: number;
  menuOpa: number;
}

// Clipboard types
interface IClipboardNode { type: 'node'; data: INode; }
interface IClipboardBranch { type: 'branch'; data: { nodes: INode[]; edges: IEdge[]; rootId: number }; }
interface IClipboardMulti { type: 'multi'; data: { nodes: INode[]; edges: IEdge[] }; }
type IClipboard = IClipboardNode | IClipboardBranch | IClipboardMulti | null;

// Trash item
interface ITrashItem {
  kind?: 'map' | 'note';
  id?: number;
  label?: string;
  note?: string;
  filename?: string;
  fsFilename?: string;
  data?: any;
  time?: number;
  deletedAt?: number;
  isFromNode?: boolean;
  updatedAt?: number;
}
