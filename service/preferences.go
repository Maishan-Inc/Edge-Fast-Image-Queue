package service

import (
	"github.com/basketikun/aivro/model"
	"github.com/basketikun/aivro/repository"
)

func GetUserPreference(user model.AuthUser) (map[string]any, error) {
	item, ok, err := repository.GetUserPreference(user.ID)
	if err != nil {
		return nil, err
	}
	if !ok || item.Value == nil {
		return map[string]any{}, nil
	}
	return item.Value, nil
}

func SaveUserPreference(user model.AuthUser, value map[string]any) (map[string]any, error) {
	nowTime := now()
	if value == nil {
		value = map[string]any{}
	}
	item := model.UserPreference{
		UserID:    user.ID,
		Value:     value,
		CreatedAt: nowTime,
		UpdatedAt: nowTime,
	}
	if saved, ok, err := repository.GetUserPreference(user.ID); err != nil {
		return nil, err
	} else if ok {
		item.CreatedAt = saved.CreatedAt
		if saved.Value != nil {
			for key, savedValue := range saved.Value {
				if _, exists := value[key]; !exists {
					value[key] = savedValue
				}
			}
			item.Value = value
		}
	}
	result, err := repository.SaveUserPreference(item)
	return result.Value, err
}
