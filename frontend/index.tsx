import React from "react";
import { initializeBlock } from "@airtable/blocks/ui";
import App from "./App";
import { WorkspaceProvider } from "./workspace/workspaceStore";

initializeBlock(() => (
    <WorkspaceProvider>
        <App />
    </WorkspaceProvider>
));