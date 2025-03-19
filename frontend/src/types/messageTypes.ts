export interface BaseMessage {
  type: string;
  timestamp: number;
}

export interface JointStatesMessage extends BaseMessage {
  type: 'joint_states';
  joints: Record<string, number>;
}

export const MessageTypes = {
  JOINT_STATES: 'joint_states'
} as const;

export function isJointStatesMessage(message: any): message is JointStatesMessage {
  return message && 
         message.type === MessageTypes.JOINT_STATES && 
         typeof message.joints === 'object';
}