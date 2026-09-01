-- CareLink 基线表结构
-- 只建共享的账号与角色表；五个业务模块的表由各模块负责人以 V2__*.sql 起依次追加。
-- 约定：迁移脚本一旦合入 master 就不可修改，改动一律新增版本号。

CREATE TABLE app_user (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    username      VARCHAR(64)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(128) NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_user_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE user_role (
    user_id BIGINT      NOT NULL,
    role    VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES app_user (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
