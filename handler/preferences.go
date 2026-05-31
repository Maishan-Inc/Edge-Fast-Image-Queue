package handler

import (
	"encoding/json"
	"net/http"

	"github.com/basketikun/aivro/service"
)

func UserPreference(w http.ResponseWriter, r *http.Request) {
	user, ok := service.UserFromContext(r.Context())
	if !ok {
		Fail(w, "未登录或权限不足")
		return
	}
	result, err := service.GetUserPreference(user)
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}

func SaveUserPreference(w http.ResponseWriter, r *http.Request) {
	user, ok := service.UserFromContext(r.Context())
	if !ok {
		Fail(w, "未登录或权限不足")
		return
	}
	var value map[string]any
	if err := json.NewDecoder(r.Body).Decode(&value); err != nil {
		Fail(w, "请求参数错误")
		return
	}
	result, err := service.SaveUserPreference(user, value)
	if err != nil {
		FailError(w, err)
		return
	}
	OK(w, result)
}
