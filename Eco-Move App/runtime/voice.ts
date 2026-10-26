import {extractDatasetInfoForQuery,extractCleanAiText,parseLocalHeuristicQuery} from '../protected/src/lib/n8nAiService';
import {N8N_CONFIG} from '../src/generated/serviceConfig';
import {createVoiceService} from '../src/platform/voiceTransport';
// Keep dataset extraction and intent heuristics in the original protected implementation.
export const {voiceCommand,cancelVoice}=createVoiceService({endpoint:N8N_CONFIG.production,extractDatasetInfoForQuery,extractCleanAiText,parseLocalHeuristicQuery});
