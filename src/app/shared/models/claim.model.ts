export interface Claim {
  id:                  number;
  reference:           string;
  policyNumber:        string;
  claimType:           string;
  type?:               string;  // Alias pour claimType
  status:              string;
  description:         string;
  incidentLocation:    string;
  incidentDate: string;
  photoUrls:           string[];
  clientEstimatedCost: number;
  vehicleBrand:        string;
  vehicleModel:        string;
  vehicleYear:         number;
  vehicleCategory:     string;
  createdAt:           string;
  date?:               string;  // Alias pour createdAt
  message:             string;
  amount?:             number;  // Alias pour clientEstimatedCost
  overallScore?: number;
  fraudType: string;
  fraudScore: number;

  ragStatus: string;
  confidence?:number;
   // ← AJOUTER
  
  clientId:             string;

}