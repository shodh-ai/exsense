
export interface LoginResponsePayload {
    success: boolean;
    data: string; // Assuming the 'data' field contains the auth token
    message: string;
  }