package repository

import (
	"errors"

	"github.com/basketikun/aivro/model"
	"gorm.io/gorm"
)

func GetUserPreference(userID string) (model.UserPreference, bool, error) {
	db, err := DB()
	if err != nil {
		return model.UserPreference{}, false, err
	}
	item := model.UserPreference{}
	err = db.Where("user_id = ?", userID).First(&item).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return item, false, err
		}
		return item, false, nil
	}
	return item, true, nil
}

func SaveUserPreference(item model.UserPreference) (model.UserPreference, error) {
	db, err := DB()
	if err != nil {
		return item, err
	}
	return item, db.Save(&item).Error
}
