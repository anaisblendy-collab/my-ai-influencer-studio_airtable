import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { BusinessPreset, InfluencerProfile } from '../types/domain';

type ContentType = 'image' | 'video';

interface WorkspaceState {
    selectedProfile: InfluencerProfile | null;
    selectedPreset: BusinessPreset | null;
    contentType: ContentType;
    activeTab: string;
}

type WorkspaceAction =
    | { type: 'setProfile'; profile: InfluencerProfile | null }
    | { type: 'setPreset'; preset: BusinessPreset | null }
    | { type: 'setContentType'; contentType: ContentType }
    | { type: 'setActiveTab'; activeTab: string };

interface WorkspaceStore extends WorkspaceState {
    setSelectedProfile: (profile: InfluencerProfile | null) => void;
    setSelectedPreset: (preset: BusinessPreset | null) => void;
    setContentType: (contentType: ContentType) => void;
    setActiveTab: (activeTab: string) => void;
}

const initialState: WorkspaceState = {
    selectedProfile: null,
    selectedPreset: null,
    contentType: 'image',
    activeTab: 'workspace'
};

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
    switch (action.type) {
        case 'setProfile':
            return { ...state, selectedProfile: action.profile };
        case 'setPreset':
            return { ...state, selectedPreset: action.preset };
        case 'setContentType':
            return { ...state, contentType: action.contentType };
        case 'setActiveTab':
            return { ...state, activeTab: action.activeTab };
        default:
            return state;
    }
}

const WorkspaceContext = createContext<WorkspaceStore | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(workspaceReducer, initialState);

    const store = useMemo<WorkspaceStore>(() => ({
        ...state,
        setSelectedProfile: (profile) => dispatch({ type: 'setProfile', profile }),
        setSelectedPreset: (preset) => dispatch({ type: 'setPreset', preset }),
        setContentType: (contentType) => dispatch({ type: 'setContentType', contentType }),
        setActiveTab: (tab) => dispatch({ type: 'setActiveTab', activeTab: tab })
    }), [state]);

    return (
        <WorkspaceContext.Provider value={store}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspaceStore() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspaceStore must be used within WorkspaceProvider');
    }
    return context;
}
