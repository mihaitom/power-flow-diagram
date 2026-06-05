import { definePowerFlow } from "./element";

export { PowerFlow, createPowerFlow } from "./core";
export type {
  FlowData,
  FlowColors,
  FlowLabels,
  PowerFlowOptions,
} from "./core";
export { PowerFlowElement, definePowerFlow } from "./element";

// Auto-register <power-flow> on import in the browser, so dropping the tag in
// just works. Calling definePowerFlow() again later is a harmless no-op.
definePowerFlow();
