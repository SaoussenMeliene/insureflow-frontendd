export interface Review {
  id:                  number;
  claimReference:      string;
  claimId:             number;
  policyNumber:        string;
  claimType:           string;
  description:         string;
  status:              string;
  contractDecision:    string;
  contractReasoning:   string;
  articlesUsed:        string;
  estimatedCostMin:    number;
  estimatedCostMax:    number;
  clientEstimatedCost: number;
  fraudType:           string;
  fraudScore:          number;
  fraudDetected:       boolean;
  fraudReasoning:      string;
  overallScore:        number;
  humanReviewReason:   string;
  reviewerName:        string;
  reviewerComment:     string;
  rejectionMotif:      string;
  finalDecision:       string;
  createdAt:           string;
  reviewedAt:          string;
}