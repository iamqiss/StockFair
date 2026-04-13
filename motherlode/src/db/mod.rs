use sea_orm::{Database};
use redis::{Client, aio::ConnectionManager};

pub async fn connect(url: &str) -> anyhow::Result<sqlx::PgPool> {
    Ok(sqlx::PgPool::connect(url).await?)
}

pub async fn connect_redis(url: &str) -> anyhow::Result<ConnectionManager> {
    let client = Client::open(url)?;
    Ok(ConnectionManager::new(client).await?)
}
