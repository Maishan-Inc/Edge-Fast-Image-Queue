package model

import "encoding/json"

type KYCStatus string

const (
	KYCStatusPending  KYCStatus = "pending"
	KYCStatusApproved KYCStatus = "approved"
	KYCStatusRejected KYCStatus = "rejected"
	KYCStatusExpired  KYCStatus = "expired"
)

type KYCVerification struct {
	ID                string          `json:"id" gorm:"primaryKey"`
	UserID            string          `json:"userId" gorm:"index"`
	Provider          string          `json:"provider" gorm:"index"`
	ProviderSessionID string          `json:"providerSessionId" gorm:"uniqueIndex"`
	Status            KYCStatus       `json:"status" gorm:"index"`
	Rewarded          bool            `json:"rewarded" gorm:"index"`
	RawPayload        json.RawMessage `json:"rawPayload" gorm:"serializer:json"`
	CreatedAt         string          `json:"createdAt"`
	UpdatedAt         string          `json:"updatedAt"`
}
