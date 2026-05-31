package repository

import (
	"time"

	"github.com/basketikun/aivro/model"
	"gorm.io/gorm"
)

func SaveCloudFile(item model.CloudFile) (model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return item, err
	}
	return item, db.Save(&item).Error
}

func GetCloudFile(id string) (model.CloudFile, bool, error) {
	db, err := DB()
	if err != nil {
		return model.CloudFile{}, false, err
	}
	item := model.CloudFile{}
	err = db.Where("id = ? AND deleted_at = ?", id, "").First(&item).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return item, false, nil
		}
		return item, false, err
	}
	return item, true, nil
}

func ListExpiredCloudFiles(now string, limit int) ([]model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 100
	}
	var items []model.CloudFile
	err = db.Where("expires_at != ? AND expires_at <= ? AND deleted_at = ?", "", now, "").Order("expires_at asc").Limit(limit).Find(&items).Error
	return items, err
}

func MarkCloudFileDeleted(id string, deletedAt string) error {
	db, err := DB()
	if err != nil {
		return err
	}
	return db.Model(&model.CloudFile{}).Where("id = ?", id).Updates(map[string]any{
		"deleted_at": deletedAt,
		"updated_at": deletedAt,
	}).Error
}

func UpdateCloudFilesPurpose(ids []string, userID string, purpose model.CloudFilePurpose, workflowID string, historyID string, expiresAt string) error {
	db, err := DB()
	if err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	updates := map[string]any{
		"purpose":     purpose,
		"workflow_id": workflowID,
		"history_id":  historyID,
		"expires_at":  expiresAt,
		"updated_at":  nowString(),
	}
	return db.Model(&model.CloudFile{}).Where("id IN ? AND user_id = ? AND deleted_at = ?", ids, userID, "").Updates(updates).Error
}

func ListCloudFilesByWorkflow(userID string, workflowID string) ([]model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return nil, err
	}
	items := []model.CloudFile{}
	err = db.Where("user_id = ? AND workflow_id = ? AND deleted_at = ?", userID, workflowID, "").Find(&items).Error
	return items, err
}

func ListCloudFilesByHistory(userID string, historyID string) ([]model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return nil, err
	}
	items := []model.CloudFile{}
	err = db.Where("user_id = ? AND history_id = ? AND deleted_at = ?", userID, historyID, "").Find(&items).Error
	return items, err
}

func nowString() string {
	return time.Now().Format(time.RFC3339)
}
