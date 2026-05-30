package repository

import (
	"github.com/basketikun/aivro/model"
)

func SaveCloudFile(item model.CloudFile) (model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return item, err
	}
	return item, db.Save(&item).Error
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
	err = db.Where("expires_at <= ? AND deleted_at = ?", now, "").Order("expires_at asc").Limit(limit).Find(&items).Error
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
