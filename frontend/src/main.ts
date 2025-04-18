import { RobotVisualization } from './robotVisualization';
import { WebSocketClient } from './webSocketClient';
import { TerminalLogger } from './utils/terminalLogger';

const SERVER_BASE = 'localhost:8000'

TerminalLogger.init();

TerminalLogger.log('Application starting...');

window.addEventListener('error', (event) => {
  TerminalLogger.error(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  TerminalLogger.error(event.reason);
});

try {
  const wsClient = new WebSocketClient(`wss://${SERVER_BASE}/ws`);
  
  const visualization = new RobotVisualization(
    document.getElementById('app') as HTMLElement,
    wsClient
  );

  visualization.start();
  
  TerminalLogger.log('Application initialized successfully');

  function createDragDropZone() {
    const dropZone = document.createElement('div');
    dropZone.id = 'urdf-drop-zone';
    dropZone.style.position = 'absolute';
    dropZone.style.top = '20px';
    dropZone.style.right = '20px';
    dropZone.style.width = '250px';
    dropZone.style.padding = '15px';
    dropZone.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    dropZone.style.color = 'white';
    dropZone.style.borderRadius = '5px';
    dropZone.style.textAlign = 'center';
    dropZone.style.zIndex = '1000';
    dropZone.innerHTML = `
      <h3>Load Robot Model</h3>
      <p>Drag and drop URDF file and meshes folder here</p>
      <div id="drop-target" style="border: 2px dashed #aaa; padding: 25px; margin-top: 10px; border-radius: 5px;">
        <p>Drop files here</p>
      </div>
      <div id="upload-status" style="margin-top: 10px; min-height: 20px;"></div>
    `;
    
    document.body.appendChild(dropZone);
    
    const dropTarget = document.getElementById('drop-target');
    const uploadStatus = document.getElementById('upload-status');
    
    if (dropTarget && uploadStatus) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropTarget.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
      });
      
      ['dragenter', 'dragover'].forEach(eventName => {
        dropTarget.addEventListener(eventName, highlight, false);
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        dropTarget.addEventListener(eventName, unhighlight, false);
      });
      
      dropTarget.addEventListener('drop', handleDrop, false);
    }
    
    function preventDefaults(e: Event) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    function highlight() {
      if(dropTarget){
        dropTarget.style.borderColor = '#fff';
        dropTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }
    }
    
    function unhighlight() {
      if(dropTarget){
        dropTarget.style.borderColor = '#aaa';
        dropTarget.style.backgroundColor = 'transparent';
      }
    }
  }
  
  createDragDropZone();

  async function handleDrop(e: DragEvent) {
    const uploadStatus = document.getElementById('upload-status');
    if (!uploadStatus) return;
    
    const dt = e.dataTransfer;
    if (!dt) return;
    
    uploadStatus.textContent = 'Processing files...';
    
    const items = Array.from(dt.items);

    const urdfEntry = items.find(item => 
      item.kind === 'file' && 
      item.webkitGetAsEntry()?.name.toLowerCase().endsWith('.urdf')
    );
    
    const dirEntry = items.find(item => 
      item.kind === 'file' && 
      item.webkitGetAsEntry()?.isDirectory
    );
    
    if (!urdfEntry) {
      uploadStatus.textContent = 'Error: No URDF file found. Please include a .urdf file.';
      return;
    }
    
    try {
      const urdfFile = urdfEntry.getAsFile();
      if (!urdfFile) {
        uploadStatus.textContent = 'Error: Could not process URDF file.';
        return;
      }
      
      const formData = new FormData();
      formData.append('file', urdfFile);
      
      if (dirEntry) {
        const entry = dirEntry.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          uploadStatus.textContent = 'Reading mesh directory...';
          const meshFiles = await readDirectoryRecursively(entry);
          console.log(meshFiles)
          
          for (const file of meshFiles) {
            const relativePath = file.relativePath;
            formData.append(`mesh_files`, file, relativePath);
          }
          
          uploadStatus.textContent = `Found ${meshFiles.length} mesh files. Uploading...`;
        }
      }
      
      const response = await fetch(`https://${SERVER_BASE}/upload_urdf`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      
      const result = await response.json();
      
      uploadStatus.textContent = 'Upload successful! Loading robot model...';
      visualization.loadRobotModel(result.model_url);
      uploadStatus.textContent = 'Robot model loaded successfully!';
      
    } catch (error) {
      console.error('Upload error:', error);
      uploadStatus.textContent = `Error: ${error.message}`;
    }
  }

  async function readDirectoryRecursively(dirEntry: FileSystemEntry): Promise<File[]> {
    const files: File[] = [];
    
    async function processEntry(entry: FileSystemEntry, path: string = '') {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise<void>((resolve) => {
          fileEntry.file((file) => {
            // Add the relative path to the file object
            Object.defineProperty(file, 'relativePath', {
              value: path + file.name,
              writable: true
            });
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        
        // Read all entries in the directory
        return new Promise<void>((resolve) => {
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
              } else {
                // Process each entry
                for (const entry of entries) {
                  await processEntry(entry, path + entry.name + '/');
                }
                // Continue reading (readEntries is limited to 100 entries at a time)
                readEntries();
              }
            });
          };
          readEntries();
        });
      }
    }
    
    await processEntry(dirEntry);
    return files;
  }
} catch (error) {
  TerminalLogger.error(error as Error);
}
