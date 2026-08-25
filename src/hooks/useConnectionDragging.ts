/**
 * useConnectionDragging.ts
 * 
 * Custom hook for managing connection dragging between nodes.
 * Handles drag-to-connect functionality with visual feedback.
 */

import React, { useState, useRef } from 'react';
import { NodeData, NodeType, Viewport } from '../types';
import { validateNodeConnection } from '../utils/connectionHelpers';

interface ConnectionStart {
    nodeId: string;
    handle: 'left' | 'right';
}

export const useConnectionDragging = () => {
    // ============================================================================
    // STATE
    // ============================================================================

    const [isDraggingConnection, setIsDraggingConnection] = useState(false);
    const [connectionStart, setConnectionStart] = useState<ConnectionStart | null>(null);
    const [tempConnectionEnd, setTempConnectionEnd] = useState<{ x: number; y: number } | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);
    const [selectedConnection, setSelectedConnection] = useState<{ parentId: string; childId: string } | null>(null);
    const dragStartTime = useRef<number>(0);

    // ============================================================================
    // HELPERS
    // ============================================================================

    /**
     * Checks if mouse is hovering over a node (for connection target)
     * Also determines which side (left or right connector) is being hovered
     * @param mouseX - Screen X coordinate
     * @param mouseY - Screen Y coordinate
     * @param nodes - Array of all nodes
     * @param viewport - Current viewport
     */
    const checkHoveredNode = (
        mouseX: number,
        mouseY: number,
        nodes: NodeData[],
        viewport: Viewport
    ) => {
        const canvasX = (mouseX - viewport.x) / viewport.zoom;
        const canvasY = (mouseY - viewport.y) / viewport.zoom;

        const found = nodes.find(n => {
            if (n.id === connectionStart?.nodeId) return false;
            return (
                canvasX >= n.x && canvasX <= n.x + 340 &&
                canvasY >= n.y && canvasY <= n.y + 400
            );
        });

        if (found) {
            setHoveredNodeId(found.id);

            // Determine which side is being hovered
            // Left connector is at x position, right connector is at x + 340
            const nodeCenter = found.x + 170; // Middle of the node
            setHoveredSide(canvasX < nodeCenter ? 'left' : 'right');
        } else {
            setHoveredNodeId(null);
            setHoveredSide(null);
        }
    };

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    /**
     * Starts connection dragging from a connector button
     */
    const handleConnectorPointerDown = (
        e: React.PointerEvent,
        nodeId: string,
        side: 'left' | 'right'
    ) => {
        e.stopPropagation();
        e.preventDefault();
        dragStartTime.current = Date.now();
        setIsDraggingConnection(true);
        setConnectionStart({ nodeId, handle: side });
        setTempConnectionEnd({ x: e.clientX, y: e.clientY });
    };

    /**
     * Updates temporary connection end point during drag
     */
    const updateConnectionDrag = (
        e: React.PointerEvent,
        nodes: NodeData[],
        viewport: Viewport
    ) => {
        if (!isDraggingConnection) return false;

        setTempConnectionEnd({ x: e.clientX, y: e.clientY });
        checkHoveredNode(e.clientX, e.clientY, nodes, viewport);
        return true;
    };

    /**
     * Completes connection drag and creates connection if valid
     * Returns true if connection was handled, false otherwise
     * @param nodes - All nodes for validation
     * @param onConnectionMade - Optional callback called with (parentId, childId) when connection is created
     */
    const completeConnectionDrag = (
        onAddNext: (nodeId: string, direction: 'left' | 'right') => void,
        onUpdateNodes: (updater: (prev: NodeData[]) => NodeData[]) => void,
        nodes: NodeData[],
        onConnectionMade?: (parentId: string, childId: string) => void
    ): boolean => {
        if (!isDraggingConnection || !connectionStart) return false;

        const dragDuration = Date.now() - dragStartTime.current;

        const validateConnection = (parentId: string, childId: string) => {
            const parentNode = nodes.find(n => n.id === parentId);
            const childNode = nodes.find(n => n.id === childId);

            if (!parentNode || !childNode) {
                return { valid: false, reason: 'The source or target node no longer exists.' };
            }

            return validateNodeConnection(parentNode.type, childNode.type);
        };

        // Short click - open menu
        if (dragDuration < 200 && !hoveredNodeId) {
            onAddNext(connectionStart.nodeId, connectionStart.handle);
        }
        // Drag to node - create connection based on target side
        else if (hoveredNodeId && hoveredSide) {
            if (hoveredSide === 'left') {
                // Connecting to LEFT connector = target receives input (target is child)
                // source is parent, hoveredNode is child
                const validation = validateConnection(connectionStart.nodeId, hoveredNodeId);
                if (!validation.valid) {
                    console.warn('Invalid canvas connection:', validation.reason);
                    window.dispatchEvent(new CustomEvent('canvas:connection-error', { detail: validation }));
                    // Invalid connection - reset and return
                    setIsDraggingConnection(false);
                    setConnectionStart(null);
                    setTempConnectionEnd(null);
                    setHoveredNodeId(null);
                    setHoveredSide(null);
                    return true;
                }

                // Add source as a parent to target node
                onUpdateNodes(prev => prev.map(n => {
                    if (n.id === hoveredNodeId) {
                        const existingParents = n.parentIds || [];
                        // Prevent duplicate connections
                        if (!existingParents.includes(connectionStart.nodeId)) {
                            return { ...n, parentIds: [...existingParents, connectionStart.nodeId] };
                        }
                    }
                    return n;
                }));
                // Notify about new connection: source is parent, hoveredNode is child
                onConnectionMade?.(connectionStart.nodeId, hoveredNodeId);
            } else {
                // Connecting to RIGHT connector = target provides output (target is parent)
                // hoveredNode is parent, source is child
                const validation = validateConnection(hoveredNodeId, connectionStart.nodeId);
                if (!validation.valid) {
                    console.warn('Invalid canvas connection:', validation.reason);
                    window.dispatchEvent(new CustomEvent('canvas:connection-error', { detail: validation }));
                    // Invalid connection - reset and return
                    setIsDraggingConnection(false);
                    setConnectionStart(null);
                    setTempConnectionEnd(null);
                    setHoveredNodeId(null);
                    setHoveredSide(null);
                    return true;
                }

                // Add target as a parent to source node
                onUpdateNodes(prev => prev.map(n => {
                    if (n.id === connectionStart.nodeId) {
                        const existingParents = n.parentIds || [];
                        // Prevent duplicate connections
                        if (!existingParents.includes(hoveredNodeId)) {
                            return { ...n, parentIds: [...existingParents, hoveredNodeId] };
                        }
                    }
                    return n;
                }));
                // Notify about new connection: hoveredNode is parent, source is child
                onConnectionMade?.(hoveredNodeId, connectionStart.nodeId);
            }
        }

        // Reset state
        setIsDraggingConnection(false);
        setConnectionStart(null);
        setTempConnectionEnd(null);
        setHoveredNodeId(null);
        setHoveredSide(null);
        return true;
    };

    /**
     * Handles clicking on a connection line to select it
     */
    const handleEdgeClick = (e: React.MouseEvent, parentId: string, childId: string) => {
        e.stopPropagation();
        setSelectedConnection({ parentId, childId });
    };

    /**
     * Deletes the currently selected connection
     */
    const deleteSelectedConnection = (onUpdateNodes: (updater: (prev: NodeData[]) => NodeData[]) => void) => {
        if (!selectedConnection) return false;

        onUpdateNodes(prev => prev.map(n => {
            if (n.id === selectedConnection.childId) {
                const existingParents = n.parentIds || [];
                return { ...n, parentIds: existingParents.filter(pid => pid !== selectedConnection.parentId) };
            }
            return n;
        }));
        setSelectedConnection(null);
        return true;
    };

    // ============================================================================
    // RETURN
    // ============================================================================

    return {
        isDraggingConnection,
        connectionStart,
        tempConnectionEnd,
        hoveredNodeId,
        selectedConnection,
        setSelectedConnection,
        handleConnectorPointerDown,
        updateConnectionDrag,
        completeConnectionDrag,
        handleEdgeClick,
        deleteSelectedConnection
    };
};
