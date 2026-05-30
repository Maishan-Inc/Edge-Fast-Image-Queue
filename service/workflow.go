package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/basketikun/aivro/config"
	"github.com/basketikun/aivro/model"
	"github.com/basketikun/aivro/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const noWorkflowCreditsMessage = "当前账号暂无工作流创建次数，请完成 KYC 认证或购买套餐获取更多创建次数。"

type SaveWorkflowInput struct {
	Title          string                 `json:"title"`
	Nodes          json.RawMessage        `json:"nodes"`
	Connections    json.RawMessage        `json:"connections"`
	ChatSessions   json.RawMessage        `json:"chatSessions"`
	ActiveChatID   string                 `json:"activeChatId"`
	BackgroundMode string                 `json:"backgroundMode"`
	ShowImageInfo  bool                   `json:"showImageInfo"`
	Viewport       json.RawMessage        `json:"viewport"`
	SourceSyncMode model.WorkflowSyncMode `json:"sourceSyncMode"`
}

type ShareWorkflowInput struct {
	PasswordEnabled bool   `json:"passwordEnabled"`
	Password        string `json:"password"`
}

type WorkflowSharePreview struct {
	ID               string          `json:"id"`
	Token            string          `json:"token"`
	Title            string          `json:"title"`
	Version          int             `json:"version"`
	RequiresPassword bool            `json:"requiresPassword"`
	Snapshot         json.RawMessage `json:"snapshot,omitempty"`
	Owner            model.AuthUser  `json:"owner"`
	SourceWorkflowID string          `json:"sourceWorkflowId"`
}

type CopyWorkflowShareInput struct {
	Mode             model.WorkflowShareCopyMode `json:"mode"`
	Password         string                      `json:"password"`
	ShareAccessToken string                      `json:"shareAccessToken"`
}

type shareAccessClaims struct {
	ShareID string `json:"shareId"`
	Token   string `json:"token"`
	UserID  string `json:"userId"`
	jwt.RegisteredClaims
}

func ListWorkflows(userID string, q model.Query) (model.WorkflowList, error) {
	db, err := repository.DB()
	if err != nil {
		return model.WorkflowList{}, err
	}
	q.Normalize()
	tx := db.Model(&model.Workflow{}).Where("user_id = ? AND deleted_at = ?", userID, "")
	if keyword := strings.TrimSpace(q.Keyword); keyword != "" {
		tx = tx.Where("title LIKE ?", "%"+keyword+"%")
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return model.WorkflowList{}, err
	}
	items := []model.Workflow{}
	err = tx.Order("updated_at desc").Offset(q.Offset()).Limit(q.PageSize).Find(&items).Error
	return model.WorkflowList{Items: items, Total: int(total)}, err
}

func GetWorkflow(userID string, id string) (model.Workflow, error) {
	db, err := repository.DB()
	if err != nil {
		return model.Workflow{}, err
	}
	item := model.Workflow{}
	err = db.Where("id = ? AND user_id = ? AND deleted_at = ?", id, userID, "").First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return item, safeMessageError{message: "工作流不存在或无权限访问"}
	}
	return item, err
}

func CreateWorkflow(userID string, input SaveWorkflowInput) (model.Workflow, error) {
	db, err := repository.DB()
	if err != nil {
		return model.Workflow{}, err
	}
	workflow := normalizeWorkflowInput(model.Workflow{ID: newID("workflow"), UserID: userID, CreatedAt: now()}, input)
	return workflow, db.Transaction(func(tx *gorm.DB) error {
		user, err := consumeWorkflowCreditTx(tx, userID, workflow.ID, "创建云端工作流")
		if err != nil {
			return err
		}
		if err := validateWorkflowCloudFilesTx(tx, userID, workflow.Nodes, workflow.ChatSessions); err != nil {
			return err
		}
		if err := tx.Create(&workflow).Error; err != nil {
			return err
		}
		return createEntitlementLogTx(tx, model.EntitlementLog{
			ID:                         newID("entitle"),
			UserID:                     user.ID,
			Source:                     model.EntitlementLogWorkflowCreate,
			SourceID:                   workflow.ID,
			WorkflowCreateCreditsDelta: -1,
			CreditsAfter:               user.Credits,
			WorkflowCreateCreditsAfter: user.WorkflowCreateCredits,
			Remark:                     "创建云端工作流",
			CreatedAt:                  now(),
		})
	})
}

func UpdateWorkflow(userID string, id string, input SaveWorkflowInput) (model.Workflow, error) {
	db, err := repository.DB()
	if err != nil {
		return model.Workflow{}, err
	}
	workflow, err := GetWorkflow(userID, id)
	if err != nil {
		return workflow, err
	}
	workflow = normalizeWorkflowInput(workflow, input)
	if err := validateWorkflowCloudFilesTx(db, userID, workflow.Nodes, workflow.ChatSessions); err != nil {
		return workflow, err
	}
	tx := db.Model(&model.Workflow{}).Where("id = ? AND user_id = ? AND deleted_at = ?", id, userID, "").Updates(workflowUpdateMap(workflow))
	if tx.Error != nil {
		return workflow, tx.Error
	}
	if tx.RowsAffected == 0 {
		return workflow, safeMessageError{message: "工作流不存在或无权限访问"}
	}
	return GetWorkflow(userID, id)
}

func DeleteWorkflow(userID string, id string) error {
	db, err := repository.DB()
	if err != nil {
		return err
	}
	tx := db.Model(&model.Workflow{}).Where("id = ? AND user_id = ? AND deleted_at = ?", id, userID, "").Updates(map[string]any{
		"deleted_at": now(),
		"updated_at": now(),
	})
	if tx.Error != nil {
		return tx.Error
	}
	if tx.RowsAffected == 0 {
		return safeMessageError{message: "工作流不存在或无权限访问"}
	}
	return nil
}

func ShareWorkflow(r *http.Request, userID string, workflowID string, input ShareWorkflowInput) (map[string]any, error) {
	db, err := repository.DB()
	if err != nil {
		return nil, err
	}
	workflow, err := GetWorkflow(userID, workflowID)
	if err != nil {
		return nil, err
	}
	snapshot, _ := json.Marshal(workflow)
	share := model.WorkflowShare{}
	found := true
	if err := db.Where("owner_id = ? AND source_workflow_id = ? AND status = ?", userID, workflowID, model.WorkflowShareStatusActive).First(&share).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		found = false
	}
	passwordHash := share.PasswordHash
	if input.PasswordEnabled {
		if strings.TrimSpace(input.Password) != "" {
			hash, err := hashPassword(input.Password)
			if err != nil {
				return nil, err
			}
			passwordHash = hash
		} else if !found || passwordHash == "" {
			return nil, safeMessageError{message: "请填写分享密码"}
		}
	} else {
		passwordHash = ""
	}
	if !found {
		share = model.WorkflowShare{
			ID:               newID("share"),
			OwnerID:          userID,
			SourceWorkflowID: workflowID,
			Token:            mustRandomToken(24),
			Version:          1,
			Status:           model.WorkflowShareStatusActive,
			CreatedAt:        now(),
		}
	} else {
		share.Version++
	}
	share.Title = workflow.Title
	share.Snapshot = snapshot
	share.PasswordEnabled = input.PasswordEnabled
	share.PasswordHash = passwordHash
	share.UpdatedAt = now()
	if err := db.Save(&share).Error; err != nil {
		return nil, err
	}
	if found {
		if err := pushLinkedShareUpdates(db, share); err != nil {
			return nil, err
		}
	}
	return map[string]any{
		"share":    share,
		"shareUrl": RequestOrigin(r) + "/share/workflows/" + share.Token,
	}, nil
}

func GetWorkflowSharePreview(userID string, token string, accessToken string) (WorkflowSharePreview, error) {
	share, err := findActiveShare(token)
	if err != nil {
		return WorkflowSharePreview{}, err
	}
	if share.PasswordEnabled && !validShareAccessToken(userID, share, accessToken) {
		return WorkflowSharePreview{ID: share.ID, Token: share.Token, Title: share.Title, Version: share.Version, RequiresPassword: true, SourceWorkflowID: share.SourceWorkflowID, Owner: shareOwner(share.OwnerID)}, nil
	}
	return sharePreview(share, false), nil
}

func VerifyWorkflowShare(userID string, token string, password string) (map[string]any, error) {
	share, err := findActiveShare(token)
	if err != nil {
		return nil, err
	}
	if !share.PasswordEnabled {
		preview := sharePreview(share, false)
		return map[string]any{"preview": preview, "shareAccessToken": ""}, nil
	}
	if bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(password)) != nil {
		return nil, safeMessageError{message: "分享密码错误"}
	}
	accessToken, err := newShareAccessToken(userID, share)
	if err != nil {
		return nil, err
	}
	preview := sharePreview(share, false)
	return map[string]any{"preview": preview, "shareAccessToken": accessToken}, nil
}

func CopyWorkflowShare(userID string, token string, input CopyWorkflowShareInput) (model.Workflow, error) {
	if input.Mode != model.WorkflowShareCopyLinked {
		input.Mode = model.WorkflowShareCopyDetached
	}
	share, err := findActiveShare(token)
	if err != nil {
		return model.Workflow{}, err
	}
	if share.PasswordEnabled && !validShareAccessToken(userID, share, input.ShareAccessToken) {
		if bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(input.Password)) != nil {
			return model.Workflow{}, safeMessageError{message: "请先验证分享密码"}
		}
	}
	source := model.Workflow{}
	_ = json.Unmarshal(share.Snapshot, &source)
	db, err := repository.DB()
	if err != nil {
		return model.Workflow{}, err
	}
	workflow := model.Workflow{
		ID:               newID("workflow"),
		UserID:           userID,
		Title:            copyTitle(share.Title),
		Nodes:            source.Nodes,
		Connections:      source.Connections,
		ChatSessions:     source.ChatSessions,
		ActiveChatID:     source.ActiveChatID,
		BackgroundMode:   source.BackgroundMode,
		ShowImageInfo:    source.ShowImageInfo,
		Viewport:         source.Viewport,
		SourceShareID:    share.ID,
		SourceWorkflowID: share.SourceWorkflowID,
		SourceVersion:    share.Version,
		CreatedAt:        now(),
		UpdatedAt:        now(),
	}
	if input.Mode == model.WorkflowShareCopyLinked {
		workflow.SourceSyncMode = model.WorkflowSyncLinked
	} else {
		workflow.SourceSyncMode = model.WorkflowSyncDetached
	}
	return workflow, db.Transaction(func(tx *gorm.DB) error {
		user, err := consumeWorkflowCreditTx(tx, userID, workflow.ID, "复制分享工作流")
		if err != nil {
			return err
		}
		if err := tx.Create(&workflow).Error; err != nil {
			return err
		}
		copy := model.WorkflowShareCopy{
			ID:               newID("share-copy"),
			ShareID:          share.ID,
			SourceWorkflowID: share.SourceWorkflowID,
			SourceOwnerID:    share.OwnerID,
			UserID:           userID,
			WorkflowID:       workflow.ID,
			Mode:             input.Mode,
			SourceVersion:    share.Version,
			CreatedAt:        now(),
			UpdatedAt:        now(),
		}
		if err := tx.Create(&copy).Error; err != nil {
			return err
		}
		return createEntitlementLogTx(tx, model.EntitlementLog{
			ID:                         newID("entitle"),
			UserID:                     user.ID,
			Source:                     model.EntitlementLogWorkflowCreate,
			SourceID:                   workflow.ID,
			WorkflowCreateCreditsDelta: -1,
			CreditsAfter:               user.Credits,
			WorkflowCreateCreditsAfter: user.WorkflowCreateCredits,
			Remark:                     "复制分享工作流",
			CreatedAt:                  now(),
		})
	})
}

func RevokeWorkflowShare(userID string, token string) error {
	db, err := repository.DB()
	if err != nil {
		return err
	}
	tx := db.Model(&model.WorkflowShare{}).Where("token = ? AND owner_id = ? AND status = ?", token, userID, model.WorkflowShareStatusActive).Updates(map[string]any{
		"status":     model.WorkflowShareStatusRevoked,
		"updated_at": now(),
	})
	if tx.Error != nil {
		return tx.Error
	}
	if tx.RowsAffected == 0 {
		return safeMessageError{message: "分享不存在或无权限操作"}
	}
	return nil
}

func normalizeWorkflowInput(workflow model.Workflow, input SaveWorkflowInput) model.Workflow {
	workflow.Title = strings.TrimSpace(input.Title)
	if workflow.Title == "" {
		workflow.Title = "未命名工作流"
	}
	workflow.Nodes = normalizeJSON(input.Nodes, "[]")
	workflow.Connections = normalizeJSON(input.Connections, "[]")
	workflow.ChatSessions = normalizeJSON(input.ChatSessions, "[]")
	workflow.ActiveChatID = input.ActiveChatID
	workflow.BackgroundMode = input.BackgroundMode
	if workflow.BackgroundMode == "" {
		workflow.BackgroundMode = "lines"
	}
	workflow.ShowImageInfo = input.ShowImageInfo
	workflow.Viewport = normalizeJSON(input.Viewport, `{"x":0,"y":0,"k":1}`)
	if workflow.SourceSyncMode == "" {
		workflow.SourceSyncMode = model.WorkflowSyncNone
	}
	workflow.UpdatedAt = now()
	return workflow
}

func workflowUpdateMap(workflow model.Workflow) map[string]any {
	return map[string]any{
		"title":           workflow.Title,
		"nodes":           workflow.Nodes,
		"connections":     workflow.Connections,
		"chat_sessions":   workflow.ChatSessions,
		"active_chat_id":  workflow.ActiveChatID,
		"background_mode": workflow.BackgroundMode,
		"show_image_info": workflow.ShowImageInfo,
		"viewport":        workflow.Viewport,
		"updated_at":      workflow.UpdatedAt,
	}
}

func normalizeJSON(value json.RawMessage, fallback string) json.RawMessage {
	if len(value) == 0 || !json.Valid(value) {
		return json.RawMessage(fallback)
	}
	return value
}

func consumeWorkflowCreditTx(tx *gorm.DB, userID string, sourceID string, remark string) (model.User, error) {
	result := tx.Model(&model.User{}).Where("id = ? AND workflow_create_credits > 0", userID).Updates(map[string]any{
		"workflow_create_credits": gorm.Expr("workflow_create_credits - 1"),
		"updated_at":              now(),
	})
	if result.Error != nil {
		return model.User{}, result.Error
	}
	if result.RowsAffected == 0 {
		return model.User{}, safeMessageError{message: noWorkflowCreditsMessage}
	}
	user := model.User{}
	if err := tx.Where("id = ?", userID).First(&user).Error; err != nil {
		return user, err
	}
	return user, nil
}

func createEntitlementLogTx(tx *gorm.DB, log model.EntitlementLog) error {
	return tx.Create(&log).Error
}

func validateWorkflowCloudFilesTx(tx *gorm.DB, userID string, chunks ...json.RawMessage) error {
	ids := map[string]bool{}
	for _, chunk := range chunks {
		var value any
		if len(chunk) == 0 || json.Unmarshal(chunk, &value) != nil {
			continue
		}
		collectCloudFileIDs(value, ids)
	}
	for id := range ids {
		var total int64
		if err := tx.Model(&model.CloudFile{}).Where("id = ? AND user_id = ?", id, userID).Count(&total).Error; err != nil {
			return err
		}
		if total == 0 {
			return safeMessageError{message: "工作流引用了无权限访问的云端文件"}
		}
	}
	return nil
}

func collectCloudFileIDs(value any, ids map[string]bool) {
	switch typed := value.(type) {
	case map[string]any:
		for key, item := range typed {
			if (key == "cloudFileId" || key == "cloud_file_id") && fmt.Sprint(item) != "" {
				ids[fmt.Sprint(item)] = true
			}
			if key == "storageKey" {
				text := fmt.Sprint(item)
				if strings.HasPrefix(text, "cloud:") {
					ids[strings.TrimPrefix(text, "cloud:")] = true
				}
			}
			collectCloudFileIDs(item, ids)
		}
	case []any:
		for _, item := range typed {
			collectCloudFileIDs(item, ids)
		}
	}
}

func pushLinkedShareUpdates(db *gorm.DB, share model.WorkflowShare) error {
	source := model.Workflow{}
	_ = json.Unmarshal(share.Snapshot, &source)
	copies := []model.WorkflowShareCopy{}
	if err := db.Where("share_id = ? AND mode = ?", share.ID, model.WorkflowShareCopyLinked).Find(&copies).Error; err != nil {
		return err
	}
	for _, item := range copies {
		if err := db.Model(&model.Workflow{}).Where("id = ? AND user_id = ? AND deleted_at = ?", item.WorkflowID, item.UserID, "").Updates(map[string]any{
			"nodes":              source.Nodes,
			"connections":        source.Connections,
			"chat_sessions":      source.ChatSessions,
			"active_chat_id":     source.ActiveChatID,
			"background_mode":    source.BackgroundMode,
			"show_image_info":    source.ShowImageInfo,
			"viewport":           source.Viewport,
			"source_version":     share.Version,
			"source_share_id":    share.ID,
			"source_workflow_id": share.SourceWorkflowID,
			"source_sync_mode":   model.WorkflowSyncLinked,
			"updated_at":         now(),
		}).Error; err != nil {
			return err
		}
		_ = db.Model(&model.WorkflowShareCopy{}).Where("id = ?", item.ID).Updates(map[string]any{"source_version": share.Version, "updated_at": now()}).Error
	}
	return nil
}

func findActiveShare(token string) (model.WorkflowShare, error) {
	db, err := repository.DB()
	if err != nil {
		return model.WorkflowShare{}, err
	}
	share := model.WorkflowShare{}
	err = db.Where("token = ? AND status = ?", token, model.WorkflowShareStatusActive).First(&share).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return share, safeMessageError{message: "分享链接不存在或已失效"}
	}
	return share, err
}

func sharePreview(share model.WorkflowShare, requiresPassword bool) WorkflowSharePreview {
	return WorkflowSharePreview{
		ID:               share.ID,
		Token:            share.Token,
		Title:            share.Title,
		Version:          share.Version,
		RequiresPassword: requiresPassword,
		Snapshot:         share.Snapshot,
		Owner:            shareOwner(share.OwnerID),
		SourceWorkflowID: share.SourceWorkflowID,
	}
}

func shareOwner(ownerID string) model.AuthUser {
	user, ok, _ := repository.GetUserByID(ownerID)
	if !ok {
		return model.AuthUser{ID: ownerID}
	}
	return model.PublicUser(user)
}

func newShareAccessToken(userID string, share model.WorkflowShare) (string, error) {
	claims := shareAccessClaims{
		ShareID: share.ID,
		Token:   share.Token,
		UserID:  userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   share.ID,
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(config.Cfg.JWTSecret))
}

func validShareAccessToken(userID string, share model.WorkflowShare, tokenText string) bool {
	if strings.TrimSpace(tokenText) == "" {
		return false
	}
	claims := shareAccessClaims{}
	token, err := jwt.ParseWithClaims(tokenText, &claims, func(token *jwt.Token) (any, error) {
		return []byte(config.Cfg.JWTSecret), nil
	})
	return err == nil && token.Valid && claims.UserID == userID && claims.ShareID == share.ID && claims.Token == share.Token
}

func mustRandomToken(size int) string {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return base64.RawURLEncoding.EncodeToString([]byte(uuid.NewString()))
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}

func copyTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "未命名工作流"
	}
	return title + " 副本"
}

func hmacSHA256Hex(secret string, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return fmt.Sprintf("%x", mac.Sum(nil))
}
