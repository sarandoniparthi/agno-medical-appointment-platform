export enum ServingStatus {
  Unspecified = 0,
  Serving = 1,
  NotServing = 2,
}

export interface HealthRequest {
  correlationId: string;
}

export interface HealthResponse {
  service: string;
  status: ServingStatus;
  correlationId: string;
}
