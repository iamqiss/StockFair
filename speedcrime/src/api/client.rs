//! HTTP client for motherlode.

use reqwest::Client;
use serde::{de::DeserializeOwned, Serialize};
use std::env;

use super::types::ApiError;

pub struct ApiClient {
    client:   Client,
    base_url: String,
}

#[derive(Debug)]
pub enum ApiResult<T> {
    Ok(T),
    Err(String),
    NetworkErr,
}

impl ApiClient {
    pub fn new() -> Self {
        let base_url = env::var("MOTHERLODE_URL")
            .unwrap_or_else(|_| "http://localhost:8080".to_string());

        Self {
            client:   Client::new(),
            base_url,
        }
    }

    pub async fn post<B: Serialize, R: DeserializeOwned>(
        &self,
        endpoint: &str,
        body: &B,
        token: Option<&str>,
    ) -> ApiResult<R> {
        let mut req = self.client
            .post(format!("{}{}", self.base_url, endpoint))
            .json(body);

        if let Some(t) = token {
            req = req.bearer_auth(t);
        }

        match req.send().await {
            Err(_) => ApiResult::NetworkErr,
            Ok(res) => {
                let status = res.status();
                if status.is_success() {
                    match res.json::<R>().await {
                        Ok(data) => ApiResult::Ok(data),
                        Err(_)   => ApiResult::Err("Failed to parse response".to_string()),
                    }
                } else {
                    let err = res.json::<ApiError>().await
                        .map(|e| e.error)
                        .unwrap_or_else(|_| format!("HTTP {}", status));
                    ApiResult::Err(err)
                }
            }
        }
    }

    pub async fn get<R: DeserializeOwned>(
        &self,
        endpoint: &str,
        token: Option<&str>,
    ) -> ApiResult<R> {
        let mut req = self.client.get(format!("{}{}", self.base_url, endpoint));
        if let Some(t) = token {
            req = req.bearer_auth(t);
        }
        match req.send().await {
            Err(_) => ApiResult::NetworkErr,
            Ok(res) => {
                if res.status().is_success() {
                    match res.json::<R>().await {
                        Ok(data) => ApiResult::Ok(data),
                        Err(_)   => ApiResult::Err("Failed to parse response".to_string()),
                    }
                } else {
                    let err = res.json::<ApiError>().await
                        .map(|e| e.error)
                        .unwrap_or_else(|_| "Request failed".to_string());
                    ApiResult::Err(err)
                }
            }
        }
    }
}

impl Default for ApiClient {
    fn default() -> Self { Self::new() }
}
