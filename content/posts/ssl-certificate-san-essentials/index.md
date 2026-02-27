---
title: "SSL 证书里的 SAN 是什么？从查看到续期的完整指南"
date: 2026-02-27T22:50:26+04:00
slug: 'ssl-certificate-san-essentials'
draft: false
cover: "https://jiejue.obs.ap-southeast-1.myhuaweicloud.com/20260227225422756.webp"
tags:
  - SSL/TLS
  - 运维
  - 安全
---

如果你负责过网站的 HTTPS 配置，大概率见过 SAN 这个缩写。它是 SSL/TLS 证书中决定"这张证书能保护哪些域名"的关键字段。这篇文章从概念出发，到用 `openssl` 实际查看，再到证书续期时需要准备什么，帮你把这条线串起来。

<!--more-->

## SAN 到底是什么

SAN 是 Subject Alternative Name 的缩写，是 X.509 v3 证书中的一个扩展字段。

早期的 SSL 证书只能通过 Subject 字段中的 CN（Common Name）绑定一个域名。SAN 扩展打破了这个限制——它允许一张证书同时声明多个受保护的名称。SAN 支持的条目类型包括 `DNS Name`（域名，最常见）、`IP Address`、`Email`、`URI` 等。比如一张证书的 SAN 可以同时包含 `example.com`、`www.example.com` 和 `api.example.com`，这三个域名都能用同一张证书完成 TLS 握手。

有一个容易被忽略的事实：**现代浏览器和 TLS 客户端在验证证书时已经完全忽略 CN，只看 SAN。** Chrome、Firefox、Go 的 TLS 库都是如此。CA/Browser Forum 的 Baseline Requirements 也早已要求所有公共 CA 签发的证书必须包含 SAN。换句话说，即使你的 CN 写对了但 SAN 里没有对应的域名，连接仍然会被拒绝。SAN 才是当前证书中域名绑定的唯一有效机制，CN 只是历史遗留。

## 用 openssl 查看 SAN

### 从 .pem 文件查看

最直接的方式：

```bash
openssl x509 -in cert.pem -noout -ext subjectAltName
```

输出类似这样：

```
X509v3 Subject Alternative Name:
    DNS:example.com, DNS:www.example.com, DNS:api.example.com
```

如果你的 openssl 版本较老，不支持 `-ext` 参数，可以用 `-text` 配合 `grep`：

```bash
openssl x509 -in cert.pem -noout -text | grep -A1 "Subject Alternative Name"
```

### 从 .pfx 文件查看

有时候你手上只有 `.pfx`（PKCS#12 格式）文件，不必先转换成 `.pem`，可以直接管道串联：

```bash
openssl pkcs12 -in cert.pfx -clcerts -nokeys | openssl x509 -noout -ext subjectAltName
```

`-clcerts` 只提取叶子证书（leaf certificate），`-nokeys` 跳过私钥。执行时会提示输入 pfx 的密码，如果密码为空，加 `-passin pass:` 跳过交互。

## 遇到 "No extensions in certificate" 怎么办

如果你对一个 `.pem` 文件运行上面的命令，得到了 `No extensions in certificate`，先别慌——这通常意味着你读到的不是你期望的那张叶子证书。

最常见的原因是 `.pem` 文件包含了证书链（多个证书拼接在一起），而 `openssl x509` 默认只读第一个。如果第一个恰好是中间 CA 证书，它自然没有你想找的 SAN。

排查步骤如下。先确认文件里有几张证书：

```bash
grep -c "BEGIN CERTIFICATE" cert.pem
```

如果输出大于 1，说明是证书链。可以拆开逐个检查：

```bash
# 查看第一张证书的 Subject，确认它是谁
openssl x509 -in cert.pem -noout -subject

# 拆分证书链
csplit -z cert.pem '/-----BEGIN CERTIFICATE-----/' '{*}'

# 逐个检查 SAN
openssl x509 -in xx00 -noout -ext subjectAltName
openssl x509 -in xx01 -noout -ext subjectAltName
```

另一种可能是文件根本不是证书——可能是私钥或 CSR。用 `head -1 cert.pem` 快速看一眼开头就能确认。

## 证书续期需要准备什么

当证书即将过期需要续期时，很多人会纠结：我需要自己准备 CSR 吗？还是交给 CA 就行？

答案取决于你的 CA 提供方式。如果证书提供商有在线管理后台（大多数公共 CA 都有），CSR 和密钥对通常可以在他们那边直接生成，你只需要在续期请求中说明涉及哪个域名即可。

如果 CA 要求你自行提交 CSR，那需要用 openssl 生成一份，把所有需要的域名写进 SAN：

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout new.key -out new.csr \
  -addext "subjectAltName=DNS:example.com,DNS:www.example.com"
```

这里有个常见问题：**续期时能不能复用去年的 CSR？** 如果域名列表没有变化，技术上可以。但通常建议重新生成——CSR 本身的生成成本极低，而重新生成意味着轮换密钥对，是更好的安全实践。如果你这次需要**新增域名**，那就必须生成新的 CSR，因为旧 CSR 的 SAN 里不包含那个新域名。

不确定要准备什么的时候，最高效的做法就是在工单里直接问 CA 管理员。

## 小结

SAN 是现代 TLS 证书中域名绑定的核心机制，CN 已被浏览器弃用。用 `openssl x509 -ext subjectAltName` 可以快速查看，遇到 `No extensions` 时多半是读到了证书链中的错误位置。续期时是否需要自备 CSR 取决于你的 CA 流程，但无论如何，保持密钥轮换的习惯总没错。

下次当你拿到一张证书文件，不妨先跑一下 SAN 查看命令——证书能保护哪些域名，一目了然。
