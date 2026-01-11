"use strict";
// ============ ENUMS ============
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotSessionState = exports.PaymentStatus = exports.PaymentProvider = exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["STAFF"] = "STAFF";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["CREATED"] = "CREATED";
    OrderStatus["PAYMENT_PENDING"] = "PAYMENT_PENDING";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["STRIPE"] = "STRIPE";
    PaymentProvider["SQUARE"] = "SQUARE";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var BotSessionState;
(function (BotSessionState) {
    BotSessionState["GREETING"] = "GREETING";
    BotSessionState["BROWSING_MENU"] = "BROWSING_MENU";
    BotSessionState["BUILDING_CART"] = "BUILDING_CART";
    BotSessionState["CHECKOUT"] = "CHECKOUT";
    BotSessionState["PAYMENT"] = "PAYMENT";
    BotSessionState["ORDER_PLACED"] = "ORDER_PLACED";
    BotSessionState["ORDER_STATUS"] = "ORDER_STATUS";
})(BotSessionState || (exports.BotSessionState = BotSessionState = {}));
