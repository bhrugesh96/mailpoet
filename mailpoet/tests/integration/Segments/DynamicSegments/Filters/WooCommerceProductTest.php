<?php declare(strict_types = 1);

namespace MailPoet\Segments\DynamicSegments\Filters;

use Helper\Database;
use MailPoet\Entities\DynamicSegmentFilterData;
use MailPoet\Entities\DynamicSegmentFilterEntity;
use MailPoet\Entities\SegmentEntity;
use MailPoet\Entities\SubscriberEntity;
use MailPoet\Subscribers\SubscribersRepository;
use MailPoetVendor\Carbon\Carbon;
use MailPoetVendor\Doctrine\DBAL\Driver\Statement;
use MailPoetVendor\Doctrine\DBAL\Query\QueryBuilder;

class WooCommerceProductTest extends \MailPoetTest {
  /** @var WooCommerceProduct */
  private $wooCommerceProduct;

  /** @var SubscribersRepository */
  private $subscribersRepository;

  /** @var int[] */
  private $productIds;

  /** @var int[] */
  private $orderIds;

  public function _before() {
    $this->wooCommerceProduct = $this->diContainer->get(WooCommerceProduct::class);
    $this->subscribersRepository = $this->diContainer->get(SubscribersRepository::class);

    Database::loadSQL('createWCLookupTables');
    $this->cleanUp();

    $customerId1 = $this->createCustomer('customer1@example.com', 'customer');
    $customerId2 = $this->createCustomer('customer2@example.com', 'customer');

    $this->createSubscriber('a1@example.com');
    $this->createSubscriber('a2@example.com');

    $this->productIds[] = $this->createProduct('testProduct1');
    $this->productIds[] = $this->createProduct('testProduct2');

    $this->orderIds[] = $this->createOrder($customerId1, Carbon::now());
    $this->addToOrder(1, $this->orderIds[0], $this->productIds[0], $customerId1);
    $this->orderIds[] = $this->createOrder($customerId2, Carbon::now());
    $this->addToOrder(2, $this->orderIds[1], $this->productIds[1], $customerId2);
  }

  public function testItGetsSubscribersThatPurchasedAnyProducts() {
    $expectedEmails = ['customer1@example.com', 'customer2@example.com'];
    $segmentFilter = $this->getSegmentFilter($this->productIds, DynamicSegmentFilterData::OPERATOR_ANY);
    $queryBuilder = $this->wooCommerceProduct->apply($this->getQueryBuilder(), $segmentFilter);
    $statement = $queryBuilder->execute();
    $result = $statement instanceof Statement ? $statement->fetchAll() : [];
    $this->assertSame(2, count($result));
    $emails = array_map([$this, 'getSubscriberEmail'], $result);
    sort($emails, SORT_STRING);
    $this->assertSame($expectedEmails, $emails);
  }

  public function testItGetsSubscribersThatDidNotPurchasedProducts() {
    $expectedEmails = ['a1@example.com','a2@example.com', 'customer2@example.com'];
    $segmentFilter = $this->getSegmentFilter([$this->productIds[0]], DynamicSegmentFilterData::OPERATOR_NONE);
    $queryBuilder = $this->wooCommerceProduct->apply($this->getQueryBuilder(), $segmentFilter);
    $statement = $queryBuilder->execute();
    $result = $statement instanceof Statement ? $statement->fetchAll() : [];
    $this->assertSame(3, count($result));
    $emails = array_map([$this, 'getSubscriberEmail'], $result);
    sort($emails, SORT_STRING);
    $this->assertSame($expectedEmails, $emails);
  }

  public function testItGetsSubscribersThatPurchasedAllProducts() {
    $segmentFilter = $this->getSegmentFilter($this->productIds, DynamicSegmentFilterData::OPERATOR_ALL);
    $queryBuilder = $this->wooCommerceProduct->apply($this->getQueryBuilder(), $segmentFilter);
    $statement = $queryBuilder->execute();
    $result = $statement instanceof Statement ? $statement->fetchAll() : [];
    $this->assertSame(0, count($result));

    $expectedEmails = ['customer1@example.com'];
    $segmentFilter = $this->getSegmentFilter([$this->productIds[0]], DynamicSegmentFilterData::OPERATOR_ALL);
    $queryBuilder = $this->wooCommerceProduct->apply($this->getQueryBuilder(), $segmentFilter);
    $statement = $queryBuilder->execute();
    $result = $statement instanceof Statement ? $statement->fetchAll() : [];
    $this->assertSame(1, count($result));
    $emails = array_map([$this, 'getSubscriberEmail'], $result);
    $this->assertSame($expectedEmails, $emails);
  }

  private function getSubscriberEmail(array $value): string {
    $subscriber = $this->entityManager->find(SubscriberEntity::class, $value['inner_subscriber_id']);
    return $subscriber instanceof SubscriberEntity ? $subscriber->getEmail() : '';
  }

  private function getQueryBuilder(): QueryBuilder {
    $subscribersTable = $this->entityManager->getClassMetadata(SubscriberEntity::class)->getTableName();
    return $this->entityManager
      ->getConnection()
      ->createQueryBuilder()
      ->select("$subscribersTable.id as inner_subscriber_id")
      ->from($subscribersTable);
  }

  private function getSegmentFilter(array $productIds, string $operator): DynamicSegmentFilterEntity {
    $filterData = [
      'product_ids' => $productIds,
      'operator' => $operator,
    ];

    $data = new DynamicSegmentFilterData(
      DynamicSegmentFilterData::TYPE_WOOCOMMERCE,
      WooCommerceProduct::ACTION_PRODUCT,
      $filterData
    );
    $segment = new SegmentEntity('Dynamic Segment', SegmentEntity::TYPE_DYNAMIC, 'description');
    $this->entityManager->persist($segment);
    $dynamicSegmentFilter = new DynamicSegmentFilterEntity($segment, $data);
    $this->entityManager->persist($dynamicSegmentFilter);
    $segment->addDynamicFilter($dynamicSegmentFilter);
    return $dynamicSegmentFilter;
  }

  private function createCustomer(string $email, string $role): int {
    global $wpdb;
    $userId = $this->tester->createWordPressUser($email, $role);
    $this->connection->executeQuery("
      INSERT INTO {$wpdb->prefix}wc_customer_lookup (customer_id, user_id, first_name, last_name, email)
      VALUES ({$userId}, {$userId}, 'First Name', 'Last Name', '{$email}')
    ");
    return $userId;
  }

  private function createOrder(int $customerId, Carbon $createdAt): int {
    global $wpdb;
    $orderData = [
      'post_type' => 'shop_order',
      'post_status' => 'wc-completed',
      'post_date' => $createdAt->toDateTimeString(),
    ];

    $orderId = wp_insert_post($orderData);
    assert(is_integer($orderId));
    $this->connection->executeQuery("
      INSERT INTO {$wpdb->prefix}wc_order_stats (order_id, customer_id, status, date_created, date_created_gmt)
      VALUES ({$orderId}, {$customerId}, 'wc-completed', '{$createdAt->toDateTimeString()}', '{$createdAt->toDateTimeString()}')
    ");
    return $orderId;
  }

  private function createProduct(string $name) {
    $productData = [
      'post_type' => 'product',
      'post_status' => 'publish',
      'post_title' => $name,
    ];
    return wp_insert_post($productData);
  }

  private function addToOrder(int $orderItemId, int $orderId, int $productId, int $customerId) {
    global $wpdb;
    $this->connection->executeQuery("
      INSERT INTO {$wpdb->prefix}wc_order_product_lookup (order_item_id, order_id, product_id, customer_id, variation_id, product_qty)
      VALUES ({$orderItemId}, {$orderId}, {$productId}, {$customerId}, 0, 1)
    ");
  }

  private function createSubscriber(string $email): SubscriberEntity {
    $subscriber = new SubscriberEntity();
    $subscriber->setEmail($email);
    $this->subscribersRepository->persist($subscriber);
    $this->subscribersRepository->flush();
    return $subscriber;
  }

  public function _after() {
    $this->cleanUp();
  }

  private function cleanUp() {
    global $wpdb;
    $this->truncateEntity(SegmentEntity::class);
    $this->truncateEntity(SubscriberEntity::class);
    $emails = ['customer1@example.com', 'customer2@example.com', 'customer3@example.com'];
    foreach ($emails as $email) {
      $this->tester->deleteWordPressUser($email);
    }

    if (!empty($this->orders)) {
      foreach ($this->orders as $orderId) {
        wp_delete_post($orderId);
      }
    }

    if (!empty($this->products)) {
      foreach ($this->products as $productId) {
        wp_delete_post($productId);
      }
    }

    $this->connection->executeQuery("TRUNCATE TABLE {$wpdb->prefix}wc_customer_lookup");
    $this->connection->executeQuery("TRUNCATE TABLE {$wpdb->prefix}wc_order_stats");
    $this->connection->executeQuery("TRUNCATE TABLE {$wpdb->prefix}wc_order_product_lookup");
  }
}