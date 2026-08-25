import { NodeType } from '../types';
import { isAdvertisingNodeType } from '../domain/advertising/nodeRegistry';

export interface ConnectionValidation {
    valid: boolean;
    reason?: string;
}

const allowedAdvertisingChildren: Partial<Record<NodeType, NodeType[]>> = {
    [NodeType.BRAND_PROFILE]: [
        NodeType.AD_BRIEF,
        NodeType.CREATIVE_ROUTE,
        NodeType.MOODBOARD,
        NodeType.AD_SCRIPT,
        NodeType.AD_STORYBOARD,
        NodeType.AD_SHOT,
        NodeType.EDIT_PLAN,
        NodeType.DELIVERY
    ],
    [NodeType.AD_BRIEF]: [NodeType.CREATIVE_ROUTE],
    [NodeType.CREATIVE_ROUTE]: [NodeType.MOODBOARD, NodeType.AD_SCRIPT],
    [NodeType.MOODBOARD]: [NodeType.AD_SCRIPT, NodeType.AD_STORYBOARD, NodeType.AD_SHOT, NodeType.IMAGE, NodeType.VIDEO],
    [NodeType.AD_SCRIPT]: [NodeType.AD_STORYBOARD, NodeType.AD_SHOT],
    [NodeType.AD_STORYBOARD]: [NodeType.AD_SHOT, NodeType.IMAGE, NodeType.VIDEO],
    [NodeType.AD_SHOT]: [NodeType.IMAGE, NodeType.VIDEO, NodeType.EDIT_PLAN, NodeType.DELIVERY],
    [NodeType.EDIT_PLAN]: [NodeType.DELIVERY]
};

export const validateNodeConnection = (parentType: NodeType, childType: NodeType): ConnectionValidation => {
    if (parentType === NodeType.AUDIO || childType === NodeType.AUDIO) {
        return { valid: false, reason: 'Audio nodes are not available in the current Demo.' };
    }

    if (isAdvertisingNodeType(parentType)) {
        const allowed = allowedAdvertisingChildren[parentType] || [];
        return allowed.includes(childType)
            ? { valid: true }
            : { valid: false, reason: `${parentType} cannot feed ${childType}. Choose the next advertising stage or a compatible generation node.` };
    }

    if (isAdvertisingNodeType(childType)) {
        if (parentType === NodeType.IMAGE) {
            return [NodeType.MOODBOARD, NodeType.AD_STORYBOARD, NodeType.AD_SHOT, NodeType.DELIVERY].includes(childType)
                ? { valid: true }
                : { valid: false, reason: 'Images can be attached to moodboards, storyboards, shots, or delivery.' };
        }
        if (parentType === NodeType.VIDEO || parentType === NodeType.VIDEO_EDITOR) {
            return [NodeType.AD_SHOT, NodeType.EDIT_PLAN, NodeType.DELIVERY].includes(childType)
                ? { valid: true }
                : { valid: false, reason: 'Video assets can be attached to shots, edit plans, or delivery.' };
        }
        return { valid: false, reason: 'Use an advertising workflow node as the upstream business dependency.' };
    }

    if (childType === NodeType.TEXT) {
        return { valid: false, reason: 'Text nodes cannot receive an input.' };
    }

    if (parentType === NodeType.TEXT) {
        return [NodeType.IMAGE, NodeType.VIDEO].includes(childType)
            ? { valid: true }
            : { valid: false, reason: 'Text can only drive image or video generation.' };
    }

    if (parentType === NodeType.VIDEO) {
        return [NodeType.VIDEO, NodeType.VIDEO_EDITOR].includes(childType)
            ? { valid: true }
            : { valid: false, reason: 'Video output can only feed another video or the video editor.' };
    }

    if (parentType === NodeType.IMAGE || parentType === NodeType.IMAGE_EDITOR) {
        return [NodeType.IMAGE, NodeType.VIDEO, NodeType.IMAGE_EDITOR].includes(childType)
            ? { valid: true }
            : { valid: false, reason: 'Image output can feed image, video, or image editing.' };
    }

    if (parentType === NodeType.VIDEO_EDITOR) {
        return childType === NodeType.VIDEO
            ? { valid: true }
            : { valid: false, reason: 'Trimmed video can only feed a video generation node.' };
    }

    return { valid: true };
};

/**
 * connectionHelpers.ts
 * 
 * Utility functions for calculating and rendering node connections.
 * Handles bezier curve path generation for connection lines.
 */

/**
 * Calculates a bezier curve path for a connection between two points
 * 
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param endX - Ending X coordinate
 * @param endY - Ending Y coordinate
 * @param direction - Direction of the connection ('right' or 'left')
 * @returns SVG path string for the bezier curve
 * 
 * @example
 * const path = calculateConnectionPath(100, 200, 500, 200, 'right');
 * // Returns: "M 100 200 C 300 200, 300 200, 500 200"
 */
export const calculateConnectionPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    direction: 'left' | 'right' = 'right'
): string => {
    const dist = Math.abs(endX - startX);
    const cpDir = direction === 'right' ? 1 : -1;

    const cp1x = startX + (dist / 2 * cpDir);
    const cp2x = endX - (dist / 2 * cpDir);

    return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
};

/**
 * Gets the connection point coordinates for a node
 * 
 * @param nodeX - Node X position
 * @param nodeY - Node Y position
 * @param side - Which side of the node ('left' or 'right')
 * @param nodeWidth - Width of the node (default: 340)
 * @param nodeHeight - Height of the node (default: 400)
 * @returns Object with x and y coordinates
 */
export const getNodeConnectionPoint = (
    nodeX: number,
    nodeY: number,
    side: 'left' | 'right',
    nodeWidth: number = 340,
    nodeHeight: number = 400
): { x: number; y: number } => {
    const midY = nodeY + nodeHeight / 2;

    return {
        x: side === 'right' ? nodeX + nodeWidth : nodeX,
        y: midY
    };
};
