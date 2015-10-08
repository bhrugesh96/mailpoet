<?php
namespace MailPoet\Mailer\API;

if(!defined('ABSPATH')) exit;

class MailGun {
  function __construct($domain, $apiKey, $from) {
    $this->url = sprintf('https://api.mailgun.net/v3/%s/messages', $domain);
    $this->apiKey = $apiKey;
    $this->from = $from;
  }

  function send($newsletter, $subscriber) {
    $this->newsletter = $newsletter;
    $this->subscriber = $subscriber;
    $result = wp_remote_post(
      $this->url,
      $this->request()
    );
    return (
      !is_wp_error($result) === true &&
      wp_remote_retrieve_response_code($result) === 200
    );
  }

  function getBody() {
    return array(
      'from' => $this->from,
      'to' => $this->subscriber,
      'subject' => $this->newsletter['subject'],
      'html' => $this->newsletter['body']['html'],
      'text' => $this->newsletter['body']['text']
    );
  }

  function auth() {
    return 'Basic ' . base64_encode('api:' . $this->apiKey);
  }

  function request() {
    return array(
      'timeout' => 10,
      'httpversion' => '1.0',
      'method' => 'POST',
      'headers' => array(
        'Content-Type' => 'application/x-www-form-urlencoded',
        'Authorization' => $this->auth()
      ),
      'body' => urldecode(http_build_query($this->getBody()))
    );
  }
}