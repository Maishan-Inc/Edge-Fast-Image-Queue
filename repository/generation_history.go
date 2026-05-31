package repository

import (
	"github.com/basketikun/aivro/model"
)

func SaveGenerationHistory(item model.GenerationHistory) (model.GenerationHistory, error) {
	db, err := DB()
	if err != nil {
		return item, err
	}
	return item, db.Save(&item).Error
}

func ListGenerationHistories(userID string, historyType model.GenerationHistoryType, query model.Query) (model.GenerationHistoryList, error) {
	db, err := DB()
	if err != nil {
		return model.GenerationHistoryList{}, err
	}
	query.Normalize()
	tx := db.Model(&model.GenerationHistory{}).Where("user_id = ?", userID)
	if historyType != "" {
		tx = tx.Where("type = ?", historyType)
	}
	if query.Keyword != "" {
		like := "%" + query.Keyword + "%"
		tx = tx.Where("title LIKE ? OR prompt LIKE ? OR model LIKE ?", like, like, like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return model.GenerationHistoryList{}, err
	}
	items := []model.GenerationHistory{}
	err = tx.Order("created_at desc").Offset((query.Page - 1) * query.PageSize).Limit(query.PageSize).Find(&items).Error
	return model.GenerationHistoryList{Items: items, Total: int(total)}, err
}

func DeleteGenerationHistory(userID string, id string) error {
	db, err := DB()
	if err != nil {
		return err
	}
	return db.Where("user_id = ? AND id = ?", userID, id).Delete(&model.GenerationHistory{}).Error
}

func DeleteGenerationHistories(ids []string) error {
	db, err := DB()
	if err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	return db.Where("id IN ?", ids).Delete(&model.GenerationHistory{}).Error
}

func ListExpiredGenerationHistories(now string, limit int) ([]model.GenerationHistory, error) {
	db, err := DB()
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 100
	}
	items := []model.GenerationHistory{}
	err = db.Where("expires_at != ? AND expires_at <= ?", "", now).Order("expires_at asc").Limit(limit).Find(&items).Error
	return items, err
}

func ListCloudFilesByIDs(ids []string) ([]model.CloudFile, error) {
	db, err := DB()
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return []model.CloudFile{}, nil
	}
	items := []model.CloudFile{}
	err = db.Where("id IN ?", ids).Find(&items).Error
	return items, err
}
