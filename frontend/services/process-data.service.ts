import { api } from './api';

export interface ProcessDataParams {
  anneemut_min: number;
  anneemut_max: number;
  code_insee: string;
}

export interface ProcessDataResult {
  success: boolean;
  totalRecords: number;
  savedRecords: number;
  message: string;
}

export const processDataService = {
  process: (params: ProcessDataParams, token: string) =>
    api.post<ProcessDataResult>('/process-data', params, token),
};
