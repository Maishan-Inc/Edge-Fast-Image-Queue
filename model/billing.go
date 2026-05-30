package model

type PlanCode string

const (
	PlanCodeGO   PlanCode = "go"
	PlanCodePlus PlanCode = "plus"
	PlanCodePro  PlanCode = "pro"
	PlanCodeMax  PlanCode = "max"
)

type Plan struct {
	ID                    string   `json:"id" gorm:"primaryKey"`
	Code                  PlanCode `json:"code" gorm:"uniqueIndex"`
	Name                  string   `json:"name"`
	Description           string   `json:"description" gorm:"type:text"`
	PriceCents            int      `json:"priceCents"`
	Currency              string   `json:"currency"`
	Credits               int      `json:"credits"`
	WorkflowCreateCredits int      `json:"workflowCreateCredits"`
	Enabled               bool     `json:"enabled" gorm:"index"`
	Recommended           bool     `json:"recommended"`
	Sort                  int      `json:"sort"`
	CreatedAt             string   `json:"createdAt"`
	UpdatedAt             string   `json:"updatedAt"`
}

type PlanOrderStatus string

const (
	PlanOrderStatusPending  PlanOrderStatus = "pending"
	PlanOrderStatusPaid     PlanOrderStatus = "paid"
	PlanOrderStatusFailed   PlanOrderStatus = "failed"
	PlanOrderStatusCanceled PlanOrderStatus = "canceled"
)

type PlanOrder struct {
	ID                      string          `json:"id" gorm:"primaryKey"`
	UserID                  string          `json:"userId" gorm:"index"`
	PlanID                  string          `json:"planId" gorm:"index"`
	Status                  PlanOrderStatus `json:"status" gorm:"index"`
	AmountCents             int             `json:"amountCents"`
	Currency                string          `json:"currency"`
	StripeCheckoutSessionID string          `json:"stripeCheckoutSessionId" gorm:"uniqueIndex"`
	StripePaymentIntentID   string          `json:"stripePaymentIntentId" gorm:"index"`
	PaidAt                  string          `json:"paidAt"`
	CreatedAt               string          `json:"createdAt"`
	UpdatedAt               string          `json:"updatedAt"`
}

type EntitlementLogSource string

const (
	EntitlementLogPlanPurchase   EntitlementLogSource = "plan_purchase"
	EntitlementLogKYCReward      EntitlementLogSource = "kyc_reward"
	EntitlementLogWorkflowCreate EntitlementLogSource = "workflow_create"
	EntitlementLogAdminAdjust    EntitlementLogSource = "admin_adjust"
)

type EntitlementLog struct {
	ID                         string               `json:"id" gorm:"primaryKey"`
	UserID                     string               `json:"userId" gorm:"index"`
	Source                     EntitlementLogSource `json:"source" gorm:"index"`
	SourceID                   string               `json:"sourceId" gorm:"index"`
	CreditsDelta               int                  `json:"creditsDelta"`
	WorkflowCreateCreditsDelta int                  `json:"workflowCreateCreditsDelta"`
	CreditsAfter               int                  `json:"creditsAfter"`
	WorkflowCreateCreditsAfter int                  `json:"workflowCreateCreditsAfter"`
	Remark                     string               `json:"remark"`
	CreatedAt                  string               `json:"createdAt"`
}
