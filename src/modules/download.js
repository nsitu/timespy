import { downloadFile } from './domElements.js';

export class DownloadManager {
    constructor(cameraManager) {
        this.cameraManager = cameraManager;
        this.setupDownloadButton();
    }

    setupDownloadButton() {
        if (downloadFile) {
            downloadFile.style.display = 'block';
            downloadFile.addEventListener('click', () => {
                this.downloadSVG();
            });
        }
    }

    downloadFile() {
        // this function needs to handle the download logic
    }
}
