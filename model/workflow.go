package model

import "encoding/json"

type WorkflowSyncMode string

const (
	WorkflowSyncNone     WorkflowSyncMode = "none"
	WorkflowSyncDetached WorkflowSyncMode = "detached"
	WorkflowSyncLinked   WorkflowSyncMode = "linked"
)

type Workflow struct {
	ID               string           `json:"id" gorm:"primaryKey"`
	UserID           string           `json:"userId" gorm:"index"`
	Title            string           `json:"title"`
	Nodes            json.RawMessage  `json:"nodes" gorm:"serializer:json"`
	Connections      json.RawMessage  `json:"connections" gorm:"serializer:json"`
	ChatSessions     json.RawMessage  `json:"chatSessions" gorm:"serializer:json"`
	ActiveChatID     string           `json:"activeChatId"`
	BackgroundMode   string           `json:"backgroundMode"`
	ShowImageInfo    bool             `json:"showImageInfo"`
	Viewport         json.RawMessage  `json:"viewport" gorm:"serializer:json"`
	SourceShareID    string           `json:"sourceShareId" gorm:"index"`
	SourceWorkflowID string           `json:"sourceWorkflowId" gorm:"index"`
	SourceSyncMode   WorkflowSyncMode `json:"sourceSyncMode" gorm:"index"`
	SourceVersion    int              `json:"sourceVersion"`
	CreatedAt        string           `json:"createdAt"`
	UpdatedAt        string           `json:"updatedAt"`
	DeletedAt        string           `json:"deletedAt" gorm:"index"`
}

type WorkflowList struct {
	Items []Workflow `json:"items"`
	Total int        `json:"total"`
}

type WorkflowShareStatus string

const (
	WorkflowShareStatusActive  WorkflowShareStatus = "active"
	WorkflowShareStatusRevoked WorkflowShareStatus = "revoked"
)

type WorkflowShare struct {
	ID               string              `json:"id" gorm:"primaryKey"`
	OwnerID          string              `json:"ownerId" gorm:"index"`
	SourceWorkflowID string              `json:"sourceWorkflowId" gorm:"index"`
	Token            string              `json:"token" gorm:"uniqueIndex"`
	Title            string              `json:"title"`
	Snapshot         json.RawMessage     `json:"snapshot" gorm:"serializer:json"`
	Version          int                 `json:"version"`
	PasswordEnabled  bool                `json:"passwordEnabled"`
	PasswordHash     string              `json:"-"`
	Status           WorkflowShareStatus `json:"status" gorm:"index"`
	CreatedAt        string              `json:"createdAt"`
	UpdatedAt        string              `json:"updatedAt"`
}

type WorkflowShareCopyMode string

const (
	WorkflowShareCopyDetached WorkflowShareCopyMode = "detached"
	WorkflowShareCopyLinked   WorkflowShareCopyMode = "linked"
)

type WorkflowShareCopy struct {
	ID               string                `json:"id" gorm:"primaryKey"`
	ShareID          string                `json:"shareId" gorm:"index"`
	SourceWorkflowID string                `json:"sourceWorkflowId" gorm:"index"`
	SourceOwnerID    string                `json:"sourceOwnerId" gorm:"index"`
	UserID           string                `json:"userId" gorm:"index"`
	WorkflowID       string                `json:"workflowId" gorm:"index"`
	Mode             WorkflowShareCopyMode `json:"mode" gorm:"index"`
	SourceVersion    int                   `json:"sourceVersion"`
	CreatedAt        string                `json:"createdAt"`
	UpdatedAt        string                `json:"updatedAt"`
}
